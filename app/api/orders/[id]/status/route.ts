import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { canTransitionOrderStatus } from "@/lib/orders/status";
import { orderStatusSchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// PATCH /api/orders/[id]/status - Controlled order status transition with server lifecycle verification
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
    const validated = orderStatusSchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    // Get current order status programmatically
    const currentOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.organizationId, orgId)),
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentStatus = String(currentOrder.status).toUpperCase();
    const targetStatus = validated.status.toUpperCase();

    // Check transition validity
    const transitionCheck = canTransitionOrderStatus(currentStatus, targetStatus);
    if (!transitionCheck.allowed) {
      return NextResponse.json(
        { error: transitionCheck.reason || "Invalid status transition" },
        { status: 400 }
      );
    }

    // Execute transition programmatically
    const updated = await db
      .update(orders)
      .set({
        status: targetStatus.toLowerCase() as any,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, id), eq(orders.organizationId, orgId)))
      .returning({
        id: orders.id,
        clientId: orders.clientId,
        status: orders.status,
        updatedAt: orders.updatedAt,
      });

    const updatedRow = updated[0];

    // Audit log
    await logActivity({
      userId: user.id,
      action: "ORDER_STATUS_CHANGED",
      entityName: "order",
      entityId: id,
      metadata: {
        from: currentStatus,
        to: targetStatus,
        notes: validated.notes || null,
      },
    });

    return NextResponse.json(updatedRow);
  } catch (error: any) {
    console.error("PATCH /api/orders/[id]/status error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update order status" },
      { status: error.statusCode || 500 }
    );
  }
}
