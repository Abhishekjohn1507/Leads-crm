import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserWithRole, requirePermission, validateClientAccess } from "@/lib/rbac/authz";
import { updateClientSchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/clients/[id] - Get client profile, orders, and activity
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

    await requirePermission("client:view");

    // Client Data Isolation Check
    const hasAccess = await validateClientAccess(user, id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden: Access denied to this client." }, { status: 403 });
    }

    const orgId = DEFAULT_ORG_ID;

    // Fetch Client Details
    const clientRes = await pool.query(
      `SELECT 
        c.id,
        c.client_name as "clientName",
        c.company_name as "companyName",
        c.email,
        c.phone,
        c.whatsapp,
        c.brand_name as "brandName",
        c.industry,
        c.gst_tax_id as "gstTaxId",
        c.assigned_employee_id as "assignedEmployeeId",
        c.source,
        c.notes,
        c.is_archived as "isArchived",
        UPPER(c.status::text) as "status",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        COALESCE(e.full_name, 'Unassigned') as "assignedEmployeeName"
      FROM clients c
      LEFT JOIN employees emp ON emp.id = c.assigned_employee_id
      LEFT JOIN users e ON e.id = emp.user_id
      WHERE c.id = $1 AND c.organization_id = $2;`,
      [id, orgId]
    );

    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = clientRes.rows[0];

    // Fetch Orders belonging to this client
    const ordersRes = await pool.query(
      `SELECT 
        o.id,
        o.package_name as "packageName",
        o.package_name_snapshot as "packageNameSnapshot",
        o.contracted_video_count as "contractedVideoCount",
        o.pricing,
        o.gst_tax as "gstTax",
        o.total_invoice_amount as "totalInvoiceAmount",
        o.amount_received as "amountReceived",
        o.outstanding_balance as "outstandingBalance",
        o.start_date as "startDate",
        o.due_date as "dueDate",
        UPPER(o.status::text) as "status",
        o.ordered_videos_quota as "orderedVideosQuota",
        o.remaining_quota as "remainingQuota",
        o.created_at as "createdAt"
      FROM orders o
      WHERE o.client_id = $1 AND o.organization_id = $2
      ORDER BY o.created_at DESC;`,
      [id, orgId]
    );

    // Fetch Recent Activity Logs for this client
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
      WHERE a.entity_id = $1 OR (a.metadata->>'clientId' = $1::text)
      ORDER BY a.created_at DESC
      LIMIT 20;`,
      [id]
    );

    return NextResponse.json({
      client,
      orders: ordersRes.rows,
      activities: activityRes.rows,
    });
  } catch (error: any) {
    console.error("GET /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch client profile" },
      { status: error.statusCode || 500 }
    );
  }
}

// PATCH /api/clients/[id] - Edit client (protects server fields id, orgId, createdAt)
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

    await requirePermission("client:update");

    const body = await request.json();
    const validated = updateClientSchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    // Check client existence
    const existing = await pool.query(
      "SELECT id, company_name FROM clients WHERE id = $1 AND organization_id = $2;",
      [id, orgId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Build dynamic update query mapping companyName to company_name
    const updates: string[] = ["updated_at = now()"];
    const values: any[] = [id, orgId];

    if (validated.clientName !== undefined) {
      values.push(validated.clientName);
      updates.push(`client_name = $${values.length}`);
    }

    if (validated.companyName !== undefined) {
      values.push(validated.companyName);
      updates.push(`company_name = $${values.length}`);
    }

    if (validated.email !== undefined) {
      values.push(validated.email);
      updates.push(`email = $${values.length}`);
    }

    if (validated.phone !== undefined) {
      values.push(validated.phone || null);
      updates.push(`phone = $${values.length}`);
    }

    if (validated.whatsapp !== undefined) {
      values.push(validated.whatsapp || null);
      updates.push(`whatsapp = $${values.length}`);
    }

    if (validated.brandName !== undefined) {
      values.push(validated.brandName || null);
      updates.push(`brand_name = $${values.length}`);
    }

    if (validated.industry !== undefined) {
      values.push(validated.industry || null);
      updates.push(`industry = $${values.length}`);
    }

    if (validated.gstTaxId !== undefined) {
      values.push(validated.gstTaxId || null);
      updates.push(`gst_tax_id = $${values.length}`);
    }

    if (validated.assignedEmployeeId !== undefined) {
      values.push(validated.assignedEmployeeId || null);
      updates.push(`assigned_employee_id = $${values.length}`);
    }

    if (validated.source !== undefined) {
      values.push(validated.source || null);
      updates.push(`source = $${values.length}`);
    }

    if (validated.notes !== undefined) {
      values.push(validated.notes || null);
      updates.push(`notes = $${values.length}`);
    }

    const query = `
      UPDATE clients 
      SET ${updates.join(", ")}
      WHERE id = $1 AND organization_id = $2
      RETURNING 
        id,
        client_name as "clientName",
        company_name as "companyName",
        email,
        phone,
        whatsapp,
        brand_name as "brandName",
        industry,
        gst_tax_id as "gstTaxId",
        assigned_employee_id as "assignedEmployeeId",
        source,
        notes,
        UPPER(status::text) as "status",
        created_at as "createdAt",
        updated_at as "updatedAt";
    `;

    const res = await pool.query(query, values);
    const updatedClient = res.rows[0];

    // Audit log
    await logActivity({
      userId: user.id,
      action: "CLIENT_UPDATED",
      entityName: "client",
      entityId: id,
      metadata: validated,
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error("PATCH /api/clients/[id] error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update client" },
      { status: error.statusCode || 500 }
    );
  }
}

// DELETE /api/clients/[id] - Safe deletion (archives client by setting status = INACTIVE)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("client:delete");

    const orgId = DEFAULT_ORG_ID;

    // Check if client has associated dependent orders
    const ordersCountRes = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE client_id = $1 AND organization_id = $2;",
      [id, orgId]
    );
    const orderCount = parseInt(ordersCountRes.rows[0].count, 10);

    // Safe archival: do not physically delete records with orders
    await pool.query(
      `UPDATE clients 
       SET status = 'inactive'::client_status, is_archived = true, updated_at = now() 
       WHERE id = $1 AND organization_id = $2;`,
      [id, orgId]
    );

    // Audit log
    await logActivity({
      userId: user.id,
      action: "CLIENT_ARCHIVED",
      entityName: "client",
      entityId: id,
      metadata: { orderCount, softDelete: true },
    });

    return NextResponse.json({
      success: true,
      message: "Client archived safely and marked as INACTIVE.",
      archived: true,
    });
  } catch (error: any) {
    console.error("DELETE /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete client" },
      { status: error.statusCode || 500 }
    );
  }
}
