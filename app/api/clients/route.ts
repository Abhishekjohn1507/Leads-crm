import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { createClientSchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/clients - Search, filter, and paginate clients for the current organization
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("client:view");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim().toLowerCase() || "";
    const assignedEmployeeId = searchParams.get("assignedEmployeeId")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const offset = (page - 1) * limit;

    // Multi-tenant Organization Scoping
    const orgId = DEFAULT_ORG_ID;

    const conditions: string[] = ["c.organization_id = $1", "c.is_archived = false"];
    const values: any[] = [orgId];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(c.client_name ILIKE $${values.length} OR c.company_name ILIKE $${values.length} OR c.email ILIKE $${values.length} OR c.brand_name ILIKE $${values.length})`
      );
    }

    if (status) {
      values.push(status);
      conditions.push(`c.status::text = $${values.length}`);
    }

    if (assignedEmployeeId) {
      values.push(assignedEmployeeId);
      conditions.push(`c.assigned_employee_id = $${values.length}`);
    }

    // If CLIENT role, enforce client isolation: client can strictly only view their own record
    if (user.role === "CLIENT") {
      if (!user.clientId) {
        return NextResponse.json({ clients: [], total: 0, page, limit });
      }
      values.push(user.clientId);
      conditions.push(`c.id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Total Count query
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM clients c ${whereClause};`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Clients query with order count aggregate
    values.push(limit);
    values.push(offset);
    const clientsQuery = `
      SELECT 
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
        UPPER(c.status::text) as "status",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        COALESCE(e.full_name, 'Unassigned') as "assignedEmployeeName",
        (SELECT COUNT(*) FROM orders o WHERE o.client_id = c.id) as "orderCount"
      FROM clients c
      LEFT JOIN employees emp ON emp.id = c.assigned_employee_id
      LEFT JOIN users e ON e.id = emp.user_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length};
    `;

    const clientsRes = await pool.query(clientsQuery, values);

    // Status aggregates for statistics cards
    const statsRes = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status::text = 'new') as new_count,
        COUNT(*) FILTER (WHERE status::text = 'onboarding') as onboarding_count,
        COUNT(*) FILTER (WHERE status::text = 'active') as active_count,
        COUNT(*) FILTER (WHERE status::text = 'on_hold') as on_hold_count
       FROM clients
       WHERE organization_id = $1 AND is_archived = false;`,
      [orgId]
    );

    return NextResponse.json({
      clients: clientsRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: parseInt(statsRes.rows[0]?.total || "0", 10),
        new: parseInt(statsRes.rows[0]?.new_count || "0", 10),
        onboarding: parseInt(statsRes.rows[0]?.onboarding_count || "0", 10),
        active: parseInt(statsRes.rows[0]?.active_count || "0", 10),
        onHold: parseInt(statsRes.rows[0]?.on_hold_count || "0", 10),
      },
    });
  } catch (error: any) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch clients" },
      { status: error.statusCode || 500 }
    );
  }
}

// POST /api/clients - Create a new client with canonical companyName
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("client:create");

    const body = await request.json();
    const validated = createClientSchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    // Canonical database insertion: mapping companyName -> company_name
    const insertQuery = `
      INSERT INTO clients (
        organization_id,
        client_name,
        company_name,
        email,
        phone,
        whatsapp,
        brand_name,
        industry,
        gst_tax_id,
        assigned_employee_id,
        source,
        notes,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::client_status
      )
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

    const statusVal = (validated.status || "LEAD").toLowerCase();

    const res = await pool.query(insertQuery, [
      orgId,
      validated.clientName,
      validated.companyName,
      validated.email,
      validated.phone || null,
      validated.whatsapp || null,
      validated.brandName || null,
      validated.industry || null,
      validated.gstTaxId || null,
      validated.assignedEmployeeId || null,
      validated.source || null,
      validated.notes || null,
      statusVal,
    ]);

    const createdClient = res.rows[0];

    // Audit log
    await logActivity({
      userId: user.id,
      action: "CLIENT_CREATED",
      entityName: "client",
      entityId: createdClient.id,
      metadata: {
        clientName: createdClient.clientName,
        companyName: createdClient.companyName,
        email: createdClient.email,
      },
    });

    return NextResponse.json(createdClient, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/clients error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create client" },
      { status: error.statusCode || 500 }
    );
  }
}
