import { Role, Permission, ROLE_PERMISSIONS } from "./permissions";

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId: string | null;
  emailVerified: boolean;
}

/**
 * Pure authorization check: evaluates if a given Role has a given Permission.
 * Safely evaluates OWNER wildcard "*", returning true for all permissions.
 * Safe to import on both Client and Server.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "OWNER") {
    return true;
  }

  const permissions = ROLE_PERMISSIONS[role] as readonly string[];
  if (!permissions) {
    return false;
  }

  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(permission);
}

/**
 * Checks if a given Role is in an allowed list of roles.
 * Safe to import on both Client and Server.
 */
export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  if (userRole === "OWNER") {
    return true;
  }
  return allowedRoles.includes(userRole);
}
