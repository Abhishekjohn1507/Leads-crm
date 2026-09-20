import React from "react";
import Link from "next/link";
import { Zap, Users, Package, ShoppingBag, Shield, FileText, Video, Clapperboard, FolderCheck } from "lucide-react";
import { Role } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/check";

export function AppNavbar({ userRole, userName }: { userRole: Role; userName: string }) {
  const canViewClients = hasPermission(userRole, "client:view");
  const canViewOrders = hasPermission(userRole, "order:view") || hasPermission(userRole, "own-order:view");
  const canViewPackages = hasPermission(userRole, "package:view");
  const canViewScripts = hasPermission(userRole, "script:view") || hasPermission(userRole, "own-script:view");
  const canViewShoots = hasPermission(userRole, "shoot:view");
  const canViewVideos = hasPermission(userRole, "video:view");
  const canManageRBAC = userRole === "OWNER" || userRole === "ADMIN";

  return (
    <header className="border-b border-zinc-800 bg-[#121212]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black shadow-md shadow-amber-500/20">
              <Zap className="w-4 h-4 fill-black" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              LEADYFY <span className="text-amber-500 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">OS</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-xs">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              {userRole === "CLIENT" ? "Client Portal" : "Dashboard"}
            </Link>

            {canViewClients && (
              <Link
                href="/clients"
                className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>Clients</span>
              </Link>
            )}

            {canViewOrders && (
              <Link
                href="/orders"
                className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                <span>{userRole === "CLIENT" ? "My Orders" : "Orders"}</span>
              </Link>
            )}

            {canViewPackages && (
              <Link
                href="/packages"
                className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5 text-amber-500" />
                <span>Packages</span>
              </Link>
            )}

            {canManageRBAC && (
              <Link
                href="/settings/roles"
                className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>RBAC</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700/80 flex items-center gap-2">
            <span className="text-zinc-400 hidden sm:inline">{userName}</span>
            <span className="font-bold text-amber-400">{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export function StatusBadge({ status, type = "client" }: { status: string; type?: "client" | "order" }) {
  const s = status.toUpperCase();

  let colors = "bg-zinc-800 text-zinc-300 border-zinc-700";

  if (s === "ACTIVE" || s === "COMPLETED") {
    colors = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  } else if (s === "ONBOARDING" || s === "IN_PRODUCTION") {
    colors = "bg-amber-500/10 text-amber-400 border-amber-500/30";
  } else if (s === "NEW" || s === "LEAD" || s === "PARTIALLY_DELIVERED") {
    colors = "bg-blue-500/10 text-blue-400 border-blue-500/30";
  } else if (s === "ON_HOLD") {
    colors = "bg-orange-500/10 text-orange-400 border-orange-500/30";
  } else if (s === "INACTIVE" || s === "CANCELLED") {
    colors = "bg-red-500/10 text-red-400 border-red-500/30";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors}`}>
      {s.replace("_", " ")}
    </span>
  );
}
