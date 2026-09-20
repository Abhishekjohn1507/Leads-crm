import { redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/rbac/authz";
import { hasPermission } from "@/lib/rbac/authz";
import { AppNavbar } from "@/components/navigation/app-navbar";
import { OrdersListClient } from "./orders-list-client";

export const metadata = {
  title: "Orders | Leadyfy OS",
  description: "Manage client commitments, UGC video packages, and production orders.",
};

export default async function OrdersPage() {
  const user = await getCurrentUserWithRole();
  if (!user) {
    redirect("/login?callbackUrl=/orders");
  }

  const canView = hasPermission(user.role, "order:view") || hasPermission(user.role, "own-order:view");
  if (!canView) {
    redirect("/dashboard");
  }

  const canCreate = hasPermission(user.role, "order:create");
  const canApply = hasPermission(user.role, "order:apply");

  return (
    <div className="min-h-screen bg-[#0d0f12] text-zinc-100 flex flex-col">
      <AppNavbar userRole={user.role} userName={user.name || user.email} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        <OrdersListClient currentUser={user} canCreate={canCreate} canApply={canApply} />
      </main>
    </div>
  );
}
