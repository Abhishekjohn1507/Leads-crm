import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { clients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

    // Get current client status programmatically
    const currentClient = await db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.organizationId, orgId)),
    });

    if (!currentClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const currentStatus = String(currentClient.status).toUpperCase();
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
    const updated = await db
      .update(clients)
      .set({
        status: targetStatus.toLowerCase() as any,
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, id), eq(clients.organizationId, orgId)))
      .returning({
        id: clients.id,
        clientName: clients.clientName,
        status: clients.status,
        updatedAt: clients.updatedAt,
      });

    const updatedRow = updated[0];

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

    return NextResponse.json(updatedRow);
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
