import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { canTransitionClientStatus } from "@/lib/clients/status";
import { clientStatusSchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// PATCH /api/clients/[id]/status - Controlled status transition with server lifecycle verification
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
    const validated = clientStatusSchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    // Get current client status
    const currentRes = await pool.query(
      "SELECT id, UPPER(status::text) as status, client_name FROM clients WHERE id = $1 AND organization_id = $2;",
      [id, orgId]
    );

    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const currentStatus = currentRes.rows[0].status;
    const targetStatus = validated.status.toUpperCase();

    // Check transition validity
    const transitionCheck = canTransitionClientStatus(currentStatus, targetStatus);
    if (!transitionCheck.allowed) {
      return NextResponse.json(
        { error: transitionCheck.reason || "Invalid status transition" },
        { status: 400 }
      );
    }

    // Execute transition
    const updateRes = await pool.query(
      `UPDATE clients 
       SET status = $1::client_status, updated_at = now() 
       WHERE id = $2 AND organization_id = $3
       RETURNING id, client_name as "clientName", UPPER(status::text) as "status", updated_at as "updatedAt";`,
      [targetStatus.toLowerCase(), id, orgId]
    );

    // Audit log
    await logActivity({
      userId: user.id,
      action: "CLIENT_STATUS_CHANGED",
      entityName: "client",
      entityId: id,
      metadata: {
        from: currentStatus,
        to: targetStatus,
        notes: validated.notes || null,
      },
    });

    return NextResponse.json(updateRes.rows[0]);
  } catch (error: any) {
    console.error("PATCH /api/clients/[id]/status error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update client status" },
      { status: error.statusCode || 500 }
    );
  }
}
