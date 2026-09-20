import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserWithRole, requirePermission, validateClientAccess } from "@/lib/rbac/authz";
import { videoRequestSchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/videos/request?orderId=... - List video requests for an order
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId query parameter is required." }, { status: 400 });
    }

    const orgId = DEFAULT_ORG_ID;

    // Check order and client access
    const orderCheck = await pool.query(
      "SELECT id, client_id, remaining_quota FROM orders WHERE id = $1 AND organization_id = $2;",
      [orderId, orgId]
    );

    if (orderCheck.rows.length === 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const hasAccess = await validateClientAccess(user, orderCheck.rows[0].client_id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden: Access denied to this order." }, { status: 403 });
    }

    const res = await pool.query(
      `SELECT 
        vr.id,
        vr.order_id as "orderId",
        vr.client_id as "clientId",
        vr.title,
        vr.hook_angle as "hookAngle",
        vr.core_message as "coreMessage",
        vr.target_audience as "targetAudience",
        vr.reference_links as "referenceLinks",
        vr.notes,
        vr.status,
        vr.created_at as "createdAt",
        COALESCE(u.name, 'Client User') as "requestedByName"
       FROM video_requests vr
       LEFT JOIN "user" u ON u.id = vr.requested_by_user_id
       WHERE vr.order_id = $1 AND vr.organization_id = $2
       ORDER BY vr.created_at DESC;`,
      [orderId, orgId]
    );

    return NextResponse.json({
      videoRequests: res.rows,
      remainingQuota: orderCheck.rows[0].remaining_quota,
    });
  } catch (error: any) {
    console.error("GET /api/videos/request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch video requests" },
      { status: error.statusCode || 500 }
    );
  }
}

// POST /api/videos/request - Submit a new video deliverable request against order quota
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("video-request:create");

    const body = await request.json();
    const validated = videoRequestSchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    // 1. Verify Order exists and belongs to the organization
    const orderRes = await pool.query(
      `SELECT 
        id, 
        client_id, 
        package_name_snapshot, 
        contracted_video_count, 
        ordered_videos_quota, 
        assigned_videos, 
        remaining_quota, 
        status 
       FROM orders 
       WHERE id = $1 AND organization_id = $2;`,
      [validated.orderId, orgId]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const order = orderRes.rows[0];

    // 2. Validate client isolation access
    const hasAccess = await validateClientAccess(user, order.client_id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to create requests for this order." },
        { status: 403 }
      );
    }

    // 3. Verify order quota availability
    if (order.remaining_quota <= 0) {
      return NextResponse.json(
        {
          error:
            "No remaining video quota on this order. You have exhausted the contracted deliverables for this package tier.",
        },
        { status: 400 }
      );
    }

    // 4. Begin transactional insertion:
    // - Insert into video_requests
    // - Increment assigned_videos, decrement remaining_quota on orders
    // - Auto-create a pending script draft for writers
    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");

      // Insert video request
      const insertReqRes = await dbClient.query(
        `INSERT INTO video_requests (
          organization_id,
          order_id,
          client_id,
          requested_by_user_id,
          title,
          hook_angle,
          core_message,
          target_audience,
          reference_links,
          notes,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SUBMITTED')
        RETURNING *;`,
        [
          orgId,
          order.id,
          order.client_id,
          user.id,
          validated.title,
          validated.hookAngle,
          validated.coreMessage || null,
          validated.targetAudience || null,
          validated.referenceLinks || [],
          validated.notes || null,
        ]
      );

      const createdReq = insertReqRes.rows[0];

      // Update Order quota counters
      const updatedOrderRes = await dbClient.query(
        `UPDATE orders 
         SET 
           assigned_videos = assigned_videos + 1,
           remaining_quota = remaining_quota - 1,
           updated_at = now()
         WHERE id = $1
         RETURNING assigned_videos, remaining_quota;`,
        [order.id]
      );

      const nextVideoNumber = (order.assigned_videos || 0) + 1;

      // Seed a corresponding script record in 'draft' status for the creative team
      await dbClient.query(
        `INSERT INTO scripts (
          client_id,
          order_id,
          video_number,
          language,
          script_text,
          reference_links,
          status,
          client_comments
        ) VALUES ($1, $2, $3, 'English', $4, $5, 'draft', $6);`,
        [
          order.client_id,
          order.id,
          nextVideoNumber,
          `[Brief: ${validated.title}]\n\nHook / Opening Angle:\n${validated.hookAngle}\n\nCore Message / Offer:\n${validated.coreMessage || "TBD"}\n\nTarget Persona:\n${validated.targetAudience || "General UGC Audience"}`,
          validated.referenceLinks || [],
          validated.notes || "Client-submitted video brief",
        ]
      );

      await dbClient.query("COMMIT");

      // 5. Activity Audit Log
      await logActivity({
        userId: user.id,
        action: "video_request.created",
        entityId: createdReq.id,
        entityName: validated.title,
        metadata: {
          organizationId: orgId,
          orderId: order.id,
          clientId: order.client_id,
          remainingQuota: updatedOrderRes.rows[0].remaining_quota,
        },
      });

      return NextResponse.json(
        {
          message: "Video deliverable request submitted successfully!",
          videoRequest: createdReq,
          updatedRemainingQuota: updatedOrderRes.rows[0].remaining_quota,
        },
        { status: 201 }
      );
    } catch (err) {
      await dbClient.query("ROLLBACK");
      throw err;
    } finally {
      dbClient.release();
    }
  } catch (error: any) {
    console.error("POST /api/videos/request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit video request" },
      { status: error.statusCode || 500 }
    );
  }
}
