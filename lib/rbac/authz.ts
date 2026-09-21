import { db } from "@/lib/drizzle";
import { authUser, clients } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { Role, Permission, ROLES } from "./permissions";
import { UserWithRole, hasPermission, hasRole } from "./check";

export type { UserWithRole };
export { hasPermission, hasRole };

/**
 * Retrieves the currently authenticated user along with their application Role and Client linkage from Neon.
 * Uses programmatic Drizzle ORM querying.
 */
export async function getCurrentUserWithRole(): Promise<UserWithRole | null> {
  const session = await getSession();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const users = await db
      .select({
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        clientId: authUser.clientId,
        emailVerified: authUser.emailVerified,
      })
      .from(authUser)
      .where(eq(authUser.id, session.user.id))
      .limit(1);

    if (users.length === 0) {
      return null;
    }

    const row = users[0];
    const role: Role = ROLES.includes(row.role as Role) ? (row.role as Role) : "CLIENT";
    let clientId: string | null = row.clientId || null;

    // If client user doesn't have client_id linked yet, resolve by email or auto-provision client record
    if (role === "CLIENT" && !clientId) {
      const clientMatches = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.email, row.email))
        .limit(1);

      if (clientMatches.length > 0) {
        clientId = clientMatches[0].id;
        // Persist linkage
        await db
          .update(authUser)
          .set({ clientId })
          .where(eq(authUser.id, row.id))
          .catch(() => {});
      } else {
        // Automatically provision client profile so they immediately appear in agency clients list
        const orgId = "00000000-0000-0000-0000-000000000001";
        const newClient = await db
          .insert(clients)
          .values({
            organizationId: orgId,
            clientName: row.name || "New Client",
            companyName: row.name ? `${row.name}'s Company` : "Pending Order Onboarding",
            email: row.email,
            status: "new",
            source: "Self Registered",
            notes: "Client account created via registration. Full order & brand details will populate upon package order.",
          })
          .returning({ id: clients.id })
          .catch(() => []);

        if (newClient.length > 0) {
          clientId = newClient[0].id;
          await db
            .update(authUser)
            .set({ clientId })
            .where(eq(authUser.id, row.id))
            .catch(() => {});
        }
      }
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role,
      clientId,
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
      // Check if user's email matches the client record programmatically
      const matches = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.email, user.email));

      return matches.some((c) => c.id === targetClientId);
    }
    return user.clientId === targetClientId;
  }

  // Other employees (EDITOR, SCRIPT_WRITER) cannot access client private records directly
  return false;
}

/**
 * Ensures that non-owners cannot delete or alter an OWNER user.
 * Throws 403 error if an ADMIN or another user attempts to delete/alter an OWNER.
 */
export async function assertCanManageUser(
  actor: UserWithRole,
  targetUserId: string,
  action: "delete" | "change_role" | "update" = "update"
): Promise<void> {
  const targetUsers = await db
    .select({ role: authUser.role })
    .from(authUser)
    .where(eq(authUser.id, targetUserId))
    .limit(1);

  if (targetUsers.length === 0) {
    const err = new Error("Target user not found");
    (err as any).statusCode = 404;
    throw err;
  }

  const targetRole = targetUsers[0].role;
  if (targetRole === "OWNER" && actor.role !== "OWNER") {
    const actionDesc = action === "delete" ? "delete" : action === "change_role" ? "modify the role of" : "modify";
    const err = new Error(`Forbidden: Only an OWNER can ${actionDesc} another OWNER user. Administrators cannot delete or demote the system OWNER.`);
    (err as any).statusCode = 403;
    throw err;
  }
}

