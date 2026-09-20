import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserWithRole, requirePermission, hasPermission } from "@/lib/rbac/authz";
import { createOrderSchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/orders - List orders with client, package, status, and date filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "order:view") && !hasPermission(user.role, "own-order:view")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const clientId = searchParams.get("clientId")?.trim() || "";
    const packageId = searchParams.get("packageId")?.trim() || "";
    const status = searchParams.get("status")?.trim().toLowerCase() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const offset = (page - 1) * limit;

    const orgId = DEFAULT_ORG_ID;

    const conditions: string[] = ["o.organization_id = $1"];
    const values: any[] = [orgId];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(o.package_name ILIKE $${values.length} OR o.package_name_snapshot ILIKE $${values.length} OR c.client_name ILIKE $${values.length} OR c.company_name ILIKE $${values.length} OR o.id::text ILIKE $${values.length})`
      );
    }

    if (clientId) {
      values.push(clientId);
      conditions.push(`o.client_id = $${values.length}`);
    }

    if (packageId) {
      values.push(packageId);
      conditions.push(`o.package_id = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`o.status::text = $${values.length}`);
    }

    // Client Isolation: if CLIENT role, enforce access only to own orders
    if (user.role === "CLIENT") {
      if (!user.clientId) {
        return NextResponse.json({ orders: [], total: 0, page, limit });
      }
      values.push(user.clientId);
      conditions.push(`o.client_id = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Total Count query
    const countRes = await pool.query(
      `SELECT COUNT(*) 
       FROM orders o 
       JOIN clients c ON c.id = o.client_id 
       ${whereClause};`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Orders query with joined client information
    values.push(limit);
    values.push(offset);
    const ordersQuery = `
      SELECT 
        o.id,
        o.client_id as "clientId",
        c.client_name as "clientName",
        c.company_name as "companyName",
        o.package_id as "packageId",
        COALESCE(o.package_name_snapshot, o.package_name) as "packageName",
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
      JOIN clients c ON c.id = o.client_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length};
    `;

    const ordersRes = await pool.query(ordersQuery, values);

    return NextResponse.json({
      orders: ordersRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch orders" },
      { status: error.statusCode || 500 }
    );
  }
}

// POST /api/orders - Create an order with package snapshot, financial calculations, and quota initialization
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("order:create");

    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    // 1. Verify that the Client belongs to the current organization
    const clientCheck = await pool.query(
      "SELECT id, client_name, company_name FROM clients WHERE id = $1 AND organization_id = $2;",
      [validated.clientId, orgId]
    );

    if (clientCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Client not found or does not belong to your organization." },
        { status: 404 }
      );
    }

    // 2. Fetch package snapshot if packageId provided
    let packageName = "Custom UGC Package";
    if (validated.packageId) {
      const pkgCheck = await pool.query(
        "SELECT id, name FROM packages WHERE id = $1 AND organization_id = $2;",
        [validated.packageId, orgId]
      );
      if (pkgCheck.rows.length > 0) {
        packageName = pkgCheck.rows[0].name;
      }
    }

    // 3. Financial Calculations:
    // Tax Amount = (Pricing * TaxRate) / 100
    // Total Amount = Pricing + Tax Amount
    // Amount Received = 0.00
    // Outstanding Balance = Total Amount
    const pricing = Number(validated.pricing);
    const taxRate = Number(validated.taxRate ?? 18);
    const taxAmount = Number(((pricing * taxRate) / 100).toFixed(2));
    const totalInvoiceAmount = Number((pricing + taxAmount).toFixed(2));
    const amountReceived = 0.0;
    const outstandingBalance = totalInvoiceAmount;

    // 4. Quota initialization
    const contractedVideoCount = validated.contractedVideoCount;
    const orderedVideosQuota = contractedVideoCount;
    const remainingQuota = contractedVideoCount;

    const insertQuery = `
      INSERT INTO orders (
        organization_id,
        client_id,
        package_id,
        package_name,
        package_name_snapshot,
        contracted_video_count,
        pricing,
        gst_tax,
        total_invoice_amount,
        amount_received,
        start_date,
        due_date,
        assigned_team_id,
        status,
        ordered_videos_quota,
        assigned_videos,
        completed_videos,
        delivered_videos,
        remaining_quota,
        tax_rate,
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'new'::order_status,
        $14, 0, 0, 0, $15, $16, $17
      )
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
        created_at as "createdAt";
    `;

    const res = await pool.query(insertQuery, [
      orgId,
      validated.clientId,
      validated.packageId || null,
      packageName,
      packageName,
      contractedVideoCount,
      pricing,
      taxAmount,
      totalInvoiceAmount,
      amountReceived,
      validated.startDate,
      validated.dueDate || null,
      validated.assignedTeamId || null,
      orderedVideosQuota,
      remainingQuota,
      taxRate,
      validated.notes || null,
    ]);

    const createdOrder = res.rows[0];

    // Audit log
    await logActivity({
      userId: user.id,
      action: "ORDER_CREATED",
      entityName: "order",
      entityId: createdOrder.id,
      metadata: {
        clientId: validated.clientId,
        packageName,
        contractedVideoCount,
        totalInvoiceAmount,
      },
    });

    return NextResponse.json(createdOrder, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/orders error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: error.statusCode || 500 }
    );
  }
}
