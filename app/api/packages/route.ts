import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { packages } from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
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

    const whereClause = activeOnly
      ? and(eq(packages.organizationId, orgId), eq(packages.isActive, true))
      : eq(packages.organizationId, orgId);

    const packageList = await db
      .select({
        id: packages.id,
        name: packages.name,
        description: packages.description,
        videoCount: packages.videoCount,
        basePrice: packages.basePrice,
        taxRate: packages.taxRate,
        isActive: packages.isActive,
        createdAt: packages.createdAt,
        updatedAt: packages.updatedAt,
      })
      .from(packages)
      .where(whereClause)
      .orderBy(asc(packages.basePrice), desc(packages.createdAt));

    return NextResponse.json(packageList);
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

    const inserted = await db
      .insert(packages)
      .values({
        organizationId: orgId,
        name: validated.name,
        description: validated.description || null,
        videoCount: validated.videoCount,
        basePrice: String(validated.basePrice),
        taxRate: String(validated.taxRate),
        isActive: validated.isActive ?? true,
      })
      .returning();

    const createdPackage = inserted[0];

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
