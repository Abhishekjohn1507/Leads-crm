import { redirect } from "next/navigation";
import { getCurrentUserWithRole, requireRole } from "@/lib/rbac/authz";
import { pool } from "@/lib/db";
import { RolesSettingsClient } from "./roles-settings-client";

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

  // Fetch users for role assignment testing
  const usersRes = await pool.query(
    'SELECT id, name, email, role, client_id as "clientId", "createdAt" as "createdAt" FROM "user" ORDER BY "createdAt" ASC LIMIT 50;'
  );

  return (
    <RolesSettingsClient
      currentUser={currentUser}
      initialUsers={usersRes.rows}
    />
  );
}
