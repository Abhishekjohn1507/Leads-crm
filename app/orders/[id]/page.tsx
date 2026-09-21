import { notFound, redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/rbac/authz";
import { hasPermission } from "@/lib/rbac/authz";
import { AppNavbar } from "@/components/navigation/app-navbar";
import { OrderDetailClient } from "./order-detail-client";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Order Detail | Leadyfy OS",
  description: "View order commitment, live production quota counter, package snapshot and audit logs.",
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const user = await getCurrentUserWithRole();
  if (!user) {
    redirect("/login");
  }

  const canView = hasPermission(user.role, "order:view") || hasPermission(user.role, "own-order:view");
  if (!canView) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const canUpdate = hasPermission(user.role, "order:update");

  return (
    <div className="min-h-screen bg-[#0d0f12] text-zinc-100 flex flex-col">
      <AppNavbar userRole={user.role} userName={user.name || user.email} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        <OrderDetailClient orderId={id} currentUser={user} canUpdate={canUpdate} />
      </main>
    </div>
  );
}
