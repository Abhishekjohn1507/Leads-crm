import { redirect } from "next/navigation";
import { getCurrentUserWithRole, requireRole } from "@/lib/rbac/authz";
import { db } from "@/lib/drizzle";
import { authUser } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { RolesSettingsClient } from "./roles-settings-client";
import { Role } from "@/lib/rbac/permissions";

export default async function RolesSettingsPage() {
  const currentUser = await getCurrentUserWithRole();

  if (!currentUser) {
    redirect("/login?callbackUrl=/settings/roles");
  }

  // Only OWNER or ADMIN can view/manage role configuration
  try {
    await requireRole("OWNER", "ADMIN");
  } catch {
    redirect("/dashboard");
  }

  // Fetch users for role assignment testing programmatically via Drizzle
  const allUsers = await db
    .select({
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      role: authUser.role,
      clientId: authUser.clientId,
      createdAt: authUser.createdAt,
    })
    .from(authUser)
    .orderBy(asc(authUser.createdAt))
    .limit(50);

  const formattedUsers = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    clientId: u.clientId,
    createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
  }));

  return (
    <RolesSettingsClient
      currentUser={currentUser}
      initialUsers={formattedUsers}
    />
  );
}
