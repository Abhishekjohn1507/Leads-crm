import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { createPackageSchema } from "@/lib/validation/module4";
import { logActivity } from "@/lib/audit/logger";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/packages - List packages (supports activeOnly=true)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("package:view");

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const orgId = DEFAULT_ORG_ID;

    const conditions = ["organization_id = $1"];
    const values: any[] = [orgId];

    if (activeOnly) {
      conditions.push("is_active = true");
    }

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
       WHERE ${conditions.join(" AND ")}
       ORDER BY base_price ASC, created_at DESC;`,
      values
    );

    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error("GET /api/packages error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch packages" },
      { status: error.statusCode || 500 }
    );
  }
}

// POST /api/packages - Create a new package
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("package:create");

    const body = await request.json();
    const validated = createPackageSchema.parse(body);

    const orgId = DEFAULT_ORG_ID;

    const res = await pool.query(
      `INSERT INTO packages (
        organization_id,
        name,
        description,
        video_count,
        base_price,
        tax_rate,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        name,
        description,
        video_count as "videoCount",
        base_price as "basePrice",
        tax_rate as "taxRate",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt";`,
      [
        orgId,
        validated.name,
        validated.description || null,
        validated.videoCount,
        validated.basePrice,
        validated.taxRate,
        validated.isActive ?? true,
      ]
    );

    const createdPackage = res.rows[0];

    await logActivity({
      userId: user.id,
      action: "PACKAGE_CREATED",
      entityName: "package",
      entityId: createdPackage.id,
      metadata: { name: createdPackage.name, basePrice: createdPackage.basePrice },
    });

    return NextResponse.json(createdPackage, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/packages error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to create package" },
      { status: error.statusCode || 500 }
    );
  }
}
