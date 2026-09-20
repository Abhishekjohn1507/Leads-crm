import { redirect } from "next/navigation";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { pool } from "@/lib/db";
import { CreateClientForm } from "./create-client-form";

export default async function NewClientPage() {
  const user = await getCurrentUserWithRole();
  if (!user) {
    redirect("/login?callbackUrl=/clients/new");
  }

  try {
    await requirePermission("client:create");
  } catch {
    redirect("/clients");
  }

  // Fetch employees for assignment (using employees.id for foreign key integrity)
  const empRes = await pool.query(
    `SELECT e.id, u.full_name, u.email 
     FROM employees e 
     JOIN users u ON u.id = e.user_id 
     ORDER BY u.full_name ASC;`
  );

  return <CreateClientForm user={user} employees={empRes.rows} />;
}
