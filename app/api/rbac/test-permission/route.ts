import { NextResponse } from "next/server";
import { getCurrentUserWithRole, requirePermission, validateClientAccess, UserWithRole } from "@/lib/rbac/authz";
import { Permission, Role, ROLE_PERMISSIONS, ROLES } from "@/lib/rbac/permissions";
import { db } from "@/lib/drizzle";
import { authUser } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { pool } from "@/lib/db";

// GET /api/rbac/test-permission?permission=lead:create&targetClientId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const permission = searchParams.get("permission") as Permission | null;
    const targetClientId = searchParams.get("targetClientId");

    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: No active session found." },
        { status: 401 }
      );
    }

    // Test permission if provided
    let permissionGranted = false;
    if (permission) {
      try {
        await requirePermission(permission);
        permissionGranted = true;
      } catch (err: any) {
        return NextResponse.json(
          {
            error: err.message,
            statusCode: 403,
            testedPermission: permission,
            userRole: user.role,
          },
          { status: 403 }
        );
      }
    }

    // Test client isolation if targetClientId provided
    let clientAccessGranted: boolean | null = null;
    if (targetClientId) {
      clientAccessGranted = await validateClientAccess(user, targetClientId);
      if (!clientAccessGranted) {
        return NextResponse.json(
          {
            error: `Forbidden: User with role '${user.role}' is not authorized to access client record '${targetClientId}'.`,
            statusCode: 403,
            testedTargetClientId: targetClientId,
            userClientId: user.clientId,
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      status: "success",
      user,
      permissionGranted,
      clientAccessGranted,
      testedPermission: permission,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 }
    );
  }
}

// POST /api/rbac/test-permission
// Allows testing role updating (for demo & testing in /settings/roles by authorized users)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER or ADMIN can modify roles
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only OWNER or ADMIN can update roles." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetUserId, newRole } = body;

    if (!targetUserId || !newRole || !ROLES.includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid parameters. Please provide valid targetUserId and newRole." },
        { status: 400 }
      );
    }

    // Prevent non-owners from assigning OWNER role
    if (newRole === "OWNER" && user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Only the existing OWNER can grant the OWNER role." },
        { status: 403 }
      );
    }

    const targetUsers = await db
      .select({ role: authUser.role })
      .from(authUser)
      .where(eq(authUser.id, targetUserId))
      .limit(1);

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const oldRole = targetUsers[0].role || null;

    // Security Rule: Admin or non-owners CANNOT modify the OWNER's role or demote the OWNER
    if (oldRole === "OWNER" && user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Administrators cannot modify or demote the system OWNER." },
        { status: 403 }
      );
    }

    await db
      .update(authUser)
      .set({ role: newRole })
      .where(eq(authUser.id, targetUserId));

    // Audit log
    await pool.query(
      'INSERT INTO role_audit_logs (target_user_id, changed_by_user_id, old_role, new_role) VALUES ($1, $2, $3, $4);',
      [targetUserId, user.id, oldRole, newRole]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `User role successfully changed to ${newRole}`,
      targetUserId,
      oldRole,
      newRole,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
