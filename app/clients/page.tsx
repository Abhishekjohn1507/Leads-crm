import { redirect } from "next/navigation";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { ClientsListClient } from "./clients-list-client";

export default async function ClientsPage() {
  const user = await getCurrentUserWithRole();
  if (!user) {
    redirect("/login?callbackUrl=/clients");
  }

  try {
    await requirePermission("client:view");
  } catch {
    redirect("/dashboard");
  }

  return <ClientsListClient user={user} />;
}
