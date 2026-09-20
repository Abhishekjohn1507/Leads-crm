import { redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/rbac/authz";
import { hasPermission } from "@/lib/rbac/authz";
import { AppNavbar } from "@/components/navigation/app-navbar";
import { PackagesClient } from "./packages-client";


export const metadata = {
  title: "Packages | Leadyfy OS",
  description: "Manage commercial service packages and UGC pricing tiers.",
};

export default async function PackagesPage() {
  const user = await getCurrentUserWithRole();
  if (!user) {
    redirect("/login?callbackUrl=/packages");
  }

  const canView = hasPermission(user.role, "package:view");
  if (!canView) {
    redirect("/dashboard");
  }

  const canCreate = hasPermission(user.role, "package:create");
  const canUpdate = hasPermission(user.role, "package:update");
  const canApply = hasPermission(user.role, "order:apply");

  return (
    <div className="min-h-screen bg-[#0d0f12] text-zinc-100 flex flex-col">
      <AppNavbar userRole={user.role} userName={user.name || user.email} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        <PackagesClient
          canCreate={canCreate}
          canUpdate={canUpdate}
          canApply={canApply}
          userRole={user.role}
        />
      </main>
    </div>
  );
}
