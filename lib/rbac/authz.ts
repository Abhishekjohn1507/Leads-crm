import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Role, Permission, ROLES } from "./permissions";
import { UserWithRole, hasPermission, hasRole } from "./check";

export type { UserWithRole };
export { hasPermission, hasRole };



/**
 * Retrieves the currently authenticated user along with their application Role and Client linkage from Neon.
 */
export async function getCurrentUserWithRole(): Promise<UserWithRole | null> {
  const session = await getSession();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const res = await pool.query(
      'SELECT id, name, email, role, client_id, "emailVerified" FROM "user" WHERE id = $1 LIMIT 1;',
      [session.user.id]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const role: Role = ROLES.includes(row.role as Role) ? (row.role as Role) : "CLIENT";

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role,
      clientId: row.client_id || null,
      emailVerified: Boolean(row.emailVerified),
    };
  } catch (error) {
    console.error("Error fetching user role from database:", error);
    return null;
  }
}

/**
 * Server-side guard requiring a specific permission.
 * Throws an Error with code 401 if unauthenticated, or 403 if forbidden.
 */
export async function requirePermission(permission: Permission): Promise<UserWithRole> {
  const user = await getCurrentUserWithRole();

  if (!user) {
    const err = new Error("Unauthorized: You must be logged in to perform this action.");
    (err as any).statusCode = 401;
    throw err;
  }

  if (!hasPermission(user.role, permission)) {
    const err = new Error(
      `Forbidden: Role '${user.role}' does not possess required permission '${permission}'.`
    );
    (err as any).statusCode = 403;
    throw err;
  }

  return user;
}

/**
 * Server-side guard requiring one of the specified roles.
 * Throws an Error with code 401 if unauthenticated, or 403 if forbidden.
 */
export async function requireRole(...allowedRoles: Role[]): Promise<UserWithRole> {
  const user = await getCurrentUserWithRole();

  if (!user) {
    const err = new Error("Unauthorized: You must be logged in to access this resource.");
    (err as any).statusCode = 401;
    throw err;
  }

  if (!hasRole(user.role, allowedRoles)) {
    const err = new Error(
      `Forbidden: Role '${user.role}' is not authorized to access this resource.`
    );
    (err as any).statusCode = 403;
    throw err;
  }

  return user;
}

/**
 * CLIENT DATA ISOLATION GUARD:
 *
 * Enforces that if the user is a CLIENT, they can strictly ONLY access records belonging to their linked clientId.
 * Internal roles (OWNER, ADMIN, SALES, etc.) pass through if they have the respective operational permissions.
 * Never trust a client ID passed via URL or request body without running this validation.
 */
export async function validateClientAccess(
  user: UserWithRole,
  targetClientId: string
): Promise<boolean> {
  if (!targetClientId) {
    return false;
  }

  // Internal agency members with operational access can access client records
  if (user.role === "OWNER" || user.role === "ADMIN" || user.role === "SALES") {
    return true;
  }

  // If role is CLIENT, they are isolated strictly to their assigned client_id
  if (user.role === "CLIENT") {
    if (!user.clientId) {
      // Check if user's email matches the client record
      const res = await pool.query("SELECT id FROM clients WHERE id = $1 AND email = $2 LIMIT 1;", [
        targetClientId,
        user.email,
      ]);
      return res.rows.length > 0;
    }
    return user.clientId === targetClientId;
  }

  // Other employees (EDITOR, SCRIPT_WRITER) cannot access client private records directly
  return false;
}
