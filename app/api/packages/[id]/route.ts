import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { updatePackageSchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/packages/[id] - Get package details
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

    await requirePermission("package:view");

    const orgId = DEFAULT_ORG_ID;

    const res = await pool.query(
      `SELECT 
        id,
        name,
        description,
        video_count as "videoCount",
        base_price as "basePrice",
        tax_rate as "taxRate",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
       FROM packages
       WHERE id = $1 AND organization_id = $2;`,
      [id, orgId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch package" },
      { status: error.statusCode || 500 }
    );
  }
}

// PATCH /api/packages/[id] - Edit package or toggle active/deactivate
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

    await requirePermission("package:update");

    const body = await request.json();
    const validated = updatePackageSchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    const updates: string[] = ["updated_at = now()"];
    const values: any[] = [id, orgId];

    if (validated.name !== undefined) {
      values.push(validated.name);
      updates.push(`name = $${values.length}`);
    }

    if (validated.description !== undefined) {
      values.push(validated.description || null);
      updates.push(`description = $${values.length}`);
    }

    if (validated.videoCount !== undefined) {
      values.push(validated.videoCount);
      updates.push(`video_count = $${values.length}`);
    }

    if (validated.basePrice !== undefined) {
      values.push(validated.basePrice);
      updates.push(`base_price = $${values.length}`);
    }

    if (validated.taxRate !== undefined) {
      values.push(validated.taxRate);
      updates.push(`tax_rate = $${values.length}`);
    }

    if (validated.isActive !== undefined) {
      values.push(validated.isActive);
      updates.push(`is_active = $${values.length}`);
    }

    const query = `
      UPDATE packages
      SET ${updates.join(", ")}
      WHERE id = $1 AND organization_id = $2
      RETURNING 
        id,
        name,
        description,
        video_count as "videoCount",
        base_price as "basePrice",
        tax_rate as "taxRate",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt";
    `;

    const res = await pool.query(query, values);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const updatedPackage = res.rows[0];

    await logActivity({
      userId: user.id,
      action: "PACKAGE_UPDATED",
      entityName: "package",
      entityId: id,
      metadata: validated,
    });

    return NextResponse.json(updatedPackage);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update package" },
      { status: error.statusCode || 500 }
    );
  }
}
