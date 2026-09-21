import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { authUser, clients, packages, orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { clientOrderApplySchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// POST /api/orders/apply - Client self-service package ordering endpoint
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    await requirePermission("order:apply");

    const body = await request.json();
    const validated = clientOrderApplySchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    // 1. Resolve client record.
    let clientId = user.clientId;

    if (!clientId) {
      const clientLookup = await db.query.clients.findFirst({
        where: and(eq(clients.email, user.email), eq(clients.organizationId, orgId)),
      });

      if (clientLookup) {
        clientId = clientLookup.id;
        await db.update(authUser).set({ clientId }).where(eq(authUser.id, user.id));
      } else {
        // Auto-provision a client profile for this user
        const newClients = await db
          .insert(clients)
          .values({
            organizationId: orgId,
            clientName: user.name || "Client",
            companyName: validated.companyName || user.name || "Client Company",
            brandName: validated.brandName || null,
            phone: validated.phone || null,
            whatsapp: validated.whatsapp || null,
            industry: validated.industry || null,
            gstTaxId: validated.gstTaxId || null,
            email: user.email,
            status: "new",
            notes: "Client account provisioned via package application.",
          })
          .returning({ id: clients.id });

        clientId = newClients[0].id;
        await db.update(authUser).set({ clientId }).where(eq(authUser.id, user.id));
      }
    }

    // 1b. Update and enrich client record with all detailed business fields provided during order creation
    const clientUpdates: Record<string, any> = {};
    if (validated.companyName) clientUpdates.companyName = validated.companyName;
    if (validated.brandName) clientUpdates.brandName = validated.brandName;
    if (validated.phone) clientUpdates.phone = validated.phone;
    if (validated.whatsapp) clientUpdates.whatsapp = validated.whatsapp;
    if (validated.industry) clientUpdates.industry = validated.industry;
    if (validated.gstTaxId) clientUpdates.gstTaxId = validated.gstTaxId;

    if (Object.keys(clientUpdates).length > 0 && clientId) {
      await db
        .update(clients)
        .set(clientUpdates)
        .where(eq(clients.id, clientId))
        .catch((e) => console.error("Error updating client details on order application:", e));
    }

    // 2. Fetch the active package details
    const pkg = await db.query.packages.findFirst({
      where: and(eq(packages.id, validated.packageId), eq(packages.organizationId, orgId)),
    });

    if (!pkg) {
      return NextResponse.json({ error: "Selected package was not found." }, { status: 404 });
    }

    if (!pkg.isActive) {
      return NextResponse.json(
        { error: "The selected package is currently archived or inactive." },
        { status: 400 }
      );
    }

    // 3. Compute pricing with GST/tax snapshot
    const pricing = parseFloat(pkg.basePrice);
    const taxRate = parseFloat(pkg.taxRate || "18.0") || 18.0;
    const gstTax = (pricing * taxRate) / 100.0;
    const totalInvoiceAmount = pricing + gstTax;
    const videoCount = pkg.videoCount;
    const startDate = validated.startDate || new Date().toISOString().split("T")[0];

    // 4. Create the new Order record with status 'new' and snapshotted terms
    const insertedOrders = await db
      .insert(orders)
      .values({
        organizationId: orgId,
        clientId,
        packageId: pkg.id,
        packageName: pkg.name,
        packageNameSnapshot: pkg.name,
        contractedVideoCount: videoCount,
        pricing: pricing.toFixed(2),
        gstTax: gstTax.toFixed(2),
        taxRate: taxRate.toFixed(2),
        totalInvoiceAmount: totalInvoiceAmount.toFixed(2),
        amountReceived: "0.00",
        startDate,
        dueDate: validated.dueDate || null,
        status: "new",
        notes: validated.notes || `Self-service package request submitted by client ${user.name} (${user.email})`,
        orderedVideosQuota: videoCount,
        assignedVideos: 0,
        completedVideos: 0,
        deliveredVideos: 0,
        remainingQuota: videoCount,
      })
      .returning();

    const newOrder = insertedOrders[0];

    // 5. Audit Log Entry
    await logActivity({
      userId: user.id,
      action: "order.client_applied",
      entityId: newOrder.id,
      entityName: newOrder.packageNameSnapshot || newOrder.packageName,
      metadata: {
        organizationId: orgId,
        clientId,
        packageId: pkg.id,
        packageName: pkg.name,
        videoCount,
        totalInvoiceAmount,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order successfully applied!",
        order: {
          id: newOrder.id,
          clientId: newOrder.clientId,
          packageName: newOrder.packageNameSnapshot,
          contractedVideoCount: newOrder.contractedVideoCount,
          totalInvoiceAmount: newOrder.totalInvoiceAmount,
          status: String(newOrder.status).toUpperCase(),
          createdAt: newOrder.createdAt ? newOrder.createdAt.toISOString() : new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/orders/apply error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply for package" },
      { status: error.statusCode || 500 }
    );
  }
}
