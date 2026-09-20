import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
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
    // If CLIENT role, user must have an associated clientId.
    // If internal user (e.g. testing), check if clientId is present or can be mapped.
    let clientId = user.clientId;

    if (!clientId) {
      // If user is CLIENT but has no clientId yet, see if there's a client matching their email
      const clientLookup = await pool.query(
        "SELECT id FROM clients WHERE email = $1 AND organization_id = $2 LIMIT 1;",
        [user.email, orgId]
      );
      if (clientLookup.rows.length > 0) {
        clientId = clientLookup.rows[0].id;
        await pool.query('UPDATE "user" SET client_id = $1 WHERE id = $2;', [clientId, user.id]);
      } else {
        // Auto-provision a client profile for this user
        const newClientRes = await pool.query(
          `INSERT INTO clients (
            organization_id,
            client_name,
            company_name,
            email,
            status,
            notes
          ) VALUES ($1, $2, $3, $4, 'new', 'Auto-created client account upon package application.')
          RETURNING id;`,
          [orgId, user.name || "Client", user.name || "Client Company", user.email]
        );
        clientId = newClientRes.rows[0].id;
        await pool.query('UPDATE "user" SET client_id = $1 WHERE id = $2;', [clientId, user.id]);
      }
    }

    // 2. Fetch the active package details
    const pkgRes = await pool.query(
      `SELECT id, name, description, video_count, base_price, tax_rate, is_active 
       FROM packages 
       WHERE id = $1 AND organization_id = $2;`,
      [validated.packageId, orgId]
    );

    if (pkgRes.rows.length === 0) {
      return NextResponse.json({ error: "Selected package was not found." }, { status: 404 });
    }

    const pkg = pkgRes.rows[0];
    if (!pkg.is_active) {
      return NextResponse.json(
        { error: "The selected package is currently archived or inactive." },
        { status: 400 }
      );
    }

    // 3. Compute pricing with GST/tax snapshot
    const pricing = parseFloat(pkg.base_price);
    const taxRate = parseFloat(pkg.tax_rate) || 18.0;
    const gstTax = (pricing * taxRate) / 100.0;
    const totalInvoiceAmount = pricing + gstTax;
    const videoCount = parseInt(pkg.video_count, 10);
    const startDate = validated.startDate || new Date().toISOString().split("T")[0];

    // 4. Create the new Order record with status 'new' and snapshotted terms
    const insertRes = await pool.query(
      `INSERT INTO orders (
        organization_id,
        client_id,
        package_id,
        package_name,
        package_name_snapshot,
        contracted_video_count,
        pricing,
        gst_tax,
        tax_rate,
        total_invoice_amount,
        amount_received,
        start_date,
        due_date,
        status,
        notes,
        ordered_videos_quota,
        assigned_videos,
        completed_videos,
        delivered_videos,
        remaining_quota
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0.00, $11, $12, 'new', $13, $14, 0, 0, 0, $15
      ) RETURNING id, client_id, package_name_snapshot, contracted_video_count, total_invoice_amount, status, created_at;`,
      [
        orgId,
        clientId,
        pkg.id,
        pkg.name,
        pkg.name,
        videoCount,
        pricing,
        gstTax,
        taxRate,
        totalInvoiceAmount,
        startDate,
        validated.dueDate || null,
        validated.notes || `Self-service package request submitted by client ${user.name} (${user.email})`,
        videoCount,
        videoCount,
      ]
    );

    const newOrder = insertRes.rows[0];

    // 5. Audit Log Entry
    await logActivity({
      userId: user.id,
      action: "order.client_applied",
      entityId: newOrder.id,
      entityName: newOrder.package_name_snapshot,
      metadata: {
        organizationId: orgId,
        clientId,
        packageId: pkg.id,
        packageName: pkg.name,
        videoQuota: videoCount,
        totalInvoiceAmount,
      },
    });

    return NextResponse.json(
      {
        message: "Order application submitted successfully!",
        order: newOrder,
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
