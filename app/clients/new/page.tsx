import { redirect } from "next/navigation";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { db } from "@/lib/drizzle";
import { employees, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
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

  // Fetch employees for assignment programmatically
  const empList = await db
    .select({
      id: employees.id,
      full_name: users.fullName,
      email: users.email,
    })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .orderBy(asc(users.fullName));

  return <CreateClientForm user={user} employees={empList} />;
}
