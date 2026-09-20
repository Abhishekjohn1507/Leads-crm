import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserWithRole, requirePermission, validateClientAccess } from "@/lib/rbac/authz";
import { updateOrderSchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/orders/[id] - Get order detail with client info, financial breakdown, and quota counter
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("order:view");

    const orgId = DEFAULT_ORG_ID;

    const res = await pool.query(
      `SELECT 
        o.id,
        o.client_id as "clientId",
        c.client_name as "clientName",
        c.company_name as "companyName",
        c.email as "clientEmail",
        o.package_id as "packageId",
        COALESCE(o.package_name_snapshot, o.package_name) as "packageName",
        o.contracted_video_count as "contractedVideoCount",
        o.pricing,
        o.gst_tax as "gstTax",
        o.tax_rate as "taxRate",
        o.total_invoice_amount as "totalInvoiceAmount",
        o.amount_received as "amountReceived",
        o.outstanding_balance as "outstandingBalance",
        o.start_date as "startDate",
        o.due_date as "dueDate",
        o.assigned_team_id as "assignedTeamId",
        o.notes,
        UPPER(o.status::text) as "status",
        o.ordered_videos_quota as "orderedVideosQuota",
        o.assigned_videos as "assignedVideos",
        o.completed_videos as "completedVideos",
        o.delivered_videos as "deliveredVideos",
        o.remaining_quota as "remainingQuota",
        o.created_at as "createdAt",
        o.updated_at as "updatedAt"
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      WHERE o.id = $1 AND o.organization_id = $2;`,
      [id, orgId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = res.rows[0];

    // Client Isolation: verify if user is allowed to access this client's order
    const hasAccess = await validateClientAccess(user, order.clientId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden: Access denied to this order." }, { status: 403 });
    }

    // Fetch related activity logs
    const activityRes = await pool.query(
      `SELECT 
        a.id,
        a.action,
        a.entity_name as "entityName",
        a.entity_id as "entityId",
        a.metadata,
        a.created_at as "createdAt",
        COALESCE(u.name, 'System') as "userName"
      FROM activity_logs a
      LEFT JOIN "user" u ON u.id = a.metadata->>'authUserId'
      WHERE a.entity_id = $1
      ORDER BY a.created_at DESC
      LIMIT 20;`,
      [id]
    );

    return NextResponse.json({
      order,
      activities: activityRes.rows,
    });
  } catch (error: any) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch order" },
      { status: error.statusCode || 500 }
    );
  }
}

// PATCH /api/orders/[id] - Update order details (dates, team, pricing recalculations)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("order:update");

    const body = await request.json();
    const validated = updateOrderSchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    // Check order existence
    const currentOrderRes = await pool.query(
      "SELECT id, pricing, gst_tax, tax_rate, amount_received FROM orders WHERE id = $1 AND organization_id = $2;",
      [id, orgId]
    );

    if (currentOrderRes.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentOrder = currentOrderRes.rows[0];

    const updates: string[] = ["updated_at = now()"];
    const values: any[] = [id, orgId];

    if (validated.contractedVideoCount !== undefined) {
      values.push(validated.contractedVideoCount);
      updates.push(`contracted_video_count = $${values.length}`);
      updates.push(`ordered_videos_quota = $${values.length}`);
      updates.push(`remaining_quota = $${values.length}`);
    }

    // Recalculate financial totals if pricing or taxRate changed
    if (validated.pricing !== undefined || validated.taxRate !== undefined) {
      const newPricing = Number(validated.pricing !== undefined ? validated.pricing : currentOrder.pricing);
      const newTaxRate = Number(validated.taxRate !== undefined ? validated.taxRate : currentOrder.tax_rate || 18);
      const newTaxAmount = Number(((newPricing * newTaxRate) / 100).toFixed(2));
      const newTotal = Number((newPricing + newTaxAmount).toFixed(2));
      const amountReceived = Number(currentOrder.amount_received || 0);
      const newBalance = Number((newTotal - amountReceived).toFixed(2));

      values.push(newPricing);
      updates.push(`pricing = $${values.length}`);

      values.push(newTaxRate);
      updates.push(`tax_rate = $${values.length}`);

      values.push(newTaxAmount);
      updates.push(`gst_tax = $${values.length}`);

      values.push(newTotal);
      updates.push(`total_invoice_amount = $${values.length}`);
    }

    if (validated.startDate !== undefined) {
      values.push(validated.startDate);
      updates.push(`start_date = $${values.length}`);
    }

    if (validated.dueDate !== undefined) {
      values.push(validated.dueDate || null);
      updates.push(`due_date = $${values.length}`);
    }

    if (validated.assignedTeamId !== undefined) {
      values.push(validated.assignedTeamId || null);
      updates.push(`assigned_team_id = $${values.length}`);
    }

    if (validated.notes !== undefined) {
      values.push(validated.notes || null);
      updates.push(`notes = $${values.length}`);
    }

    const query = `
      UPDATE orders
      SET ${updates.join(", ")}
      WHERE id = $1 AND organization_id = $2
      RETURNING 
        id,
        client_id as "clientId",
        package_id as "packageId",
        package_name_snapshot as "packageNameSnapshot",
        contracted_video_count as "contractedVideoCount",
        pricing,
        gst_tax as "gstTax",
        total_invoice_amount as "totalInvoiceAmount",
        amount_received as "amountReceived",
        outstanding_balance as "outstandingBalance",
        start_date as "startDate",
        due_date as "dueDate",
        UPPER(status::text) as "status",
        ordered_videos_quota as "orderedVideosQuota",
        remaining_quota as "remainingQuota",
        updated_at as "updatedAt";
    `;

    const res = await pool.query(query, values);
    const updatedOrder = res.rows[0];

    await logActivity({
      userId: user.id,
      action: "ORDER_UPDATED",
      entityName: "order",
      entityId: id,
      metadata: validated,
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error("PATCH /api/orders/[id] error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update order" },
      { status: error.statusCode || 500 }
    );
  }
}
