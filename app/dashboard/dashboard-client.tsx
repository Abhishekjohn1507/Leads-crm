"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { 
  Zap, 
  Users, 
  ShoppingBag, 
  Package, 
  ShieldCheck, 
  TrendingUp, 
  Video, 
  IndianRupee, 
  ArrowRight, 
  Plus, 
  Building2, 
  Clock, 
  Layers, 
  LogOut,
  Sparkles
} from "lucide-react";

import { Role } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/check";
import { AppNavbar, StatusBadge } from "@/components/navigation/app-navbar";

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalOrders: number;
  activeOrders: number;
  totalCommittedRevenue: number;
  outstandingRevenue: number;
  contractedVideos: number;
  remainingQuota: number;
}

interface DashboardClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    clientId?: string | null;
    emailVerified?: boolean;
    image?: string | null;
    createdAt?: Date | string;
  };
  session: {
    id: string;
    expiresAt: Date | string;
  };
  stats: DashboardStats;
  recentClients: Array<{
    id: string;
    clientName: string;
    companyName: string | null;
    email: string;
    status: string;
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    clientId: string;
    clientName: string;
    companyName: string | null;
    packageName: string;
    contractedVideoCount: number;
    totalInvoiceAmount: number;
    status: string;
    createdAt: string;
  }>;
}

export function DashboardClient({ user, stats, recentClients, recentOrders }: DashboardClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const canViewClients = hasPermission(user.role, "client:view");
  const canManageClients = hasPermission(user.role, "client:create");
  const canManagePackages = hasPermission(user.role, "package:view");
  const canManageRBAC = user.role === "OWNER" || user.role === "ADMIN";

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-amber-500 selection:text-black flex flex-col">
      {/* Top Application Navbar */}
      <AppNavbar userRole={user.role} userName={user.name || user.email} />

      {/* Main Agency Control Center */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Executive Header Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-zinc-900 via-[#161616] to-[#121212] border border-zinc-800/80 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {user.role === "CLIENT"
                  ? "Client Portal & Delivery Hub"
                  : user.role === "SALES"
                  ? "Sales & Client Acquisition Workspace"
                  : user.role === "SCRIPT_WRITER"
                  ? "Script Production & Creative Workspace"
                  : user.role === "SHOOT_MANAGER"
                  ? "Shoot Logistics & Creator Workspace"
                  : user.role === "EDITOR"
                  ? "Post-Production & Video Review Workspace"
                  : "Agency Operations Control Center"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, <span className="text-amber-500">{user.name}</span>
            </h1>
            <p className="mt-1.5 text-zinc-400 text-xs sm:text-sm leading-relaxed">
              {user.role === "CLIENT"
                ? "Track your UGC video deliverable quotas, current production stages, and package details."
                : user.role === "SALES"
                ? "Manage customer pipelines, onboarding requests, and order creation."
                : user.role === "SCRIPT_WRITER"
                ? "Draft, refine, and submit video scripts for client approvals."
                : user.role === "SHOOT_MANAGER"
                ? "Coordinate creators, production logistics, and shoot scheduling."
                : user.role === "EDITOR"
                ? "Manage video editing queues, color grading, and delivery revisions."
                : "Real-time oversight for UGC client commitments, video production quotas, and commercial operations."}
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            {canManageClients && (
              <Link
                href="/clients/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Client
              </Link>
            )}
            {canManagePackages && (
              <Link
                href="/packages"
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-xs border border-zinc-700/80 transition-colors"
              >
                <Package className="w-4 h-4 text-amber-500" />
                Packages
              </Link>
            )}
            {user.role === "CLIENT" && (
              <>
                <Link
                  href="/packages"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-xl text-xs border border-zinc-700/80 transition-colors"
                >
                  <Package className="w-4 h-4 text-amber-500" />
                  Browse Packages
                </Link>
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  My Orders
                </Link>
              </>
            )}
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs border border-zinc-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>

        {/* Operational Key Metrics Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${user.role === "CLIENT" ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-5`}>
          {/* Active Clients (Hidden for Client role) */}
          {user.role !== "CLIENT" && (
            <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition">
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Client Roster</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-white">{stats.totalClients}</div>
              <div className="mt-1 text-xs text-zinc-400 flex items-center justify-between">
                <span>{stats.activeClients} Active Clients</span>
                <Link href="/clients" className="text-amber-500 hover:text-amber-400 inline-flex items-center gap-1 font-medium">
                  View &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Active Orders / Commitments */}
          <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {user.role === "CLIENT" ? "Your Orders" : "Commitments"}
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-white">{stats.totalOrders}</div>
            <div className="mt-1 text-xs text-zinc-400 flex items-center justify-between">
              <span>{stats.activeOrders} In Production</span>
              <Link href="/orders" className="text-amber-500 hover:text-amber-400 inline-flex items-center gap-1 font-medium">
                View &rarr;
              </Link>
            </div>
          </div>

          {/* UGC Video Production Quota */}
          <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Video Deliverables</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {stats.remainingQuota}
              <span className="text-xs font-normal text-zinc-500 ml-1.5 font-sans">
                / {stats.contractedVideos} quota
              </span>
            </div>
            <div className="mt-1 text-xs text-zinc-400 flex items-center justify-between">
              <span>Remaining contracted</span>
              <span className="text-emerald-400 font-medium">Live Counter</span>
            </div>
          </div>

          {/* Committed Invoiced Revenue / Investment Value */}
          <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {user.role === "CLIENT" ? "Contracted Value" : "Commercial Value"}
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              ₹{stats.totalCommittedRevenue.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-zinc-400 flex items-center justify-between">
              <span>Bal: ₹{stats.outstandingRevenue.toLocaleString()}</span>
              <span className="text-zinc-500 text-[11px]">
                {user.role === "CLIENT" ? "Outstanding" : "Snapshot integrity"}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Pipelines: Recent Clients & Orders */}
        <div className={`grid grid-cols-1 ${canViewClients ? "lg:grid-cols-2" : "max-w-4xl mx-auto w-full"} gap-6`}>
          {/* Recent Clients (Only for internal roles with client:view permission) */}
          {canViewClients && (
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>Recent Clients</span>
                </div>
                <Link
                  href="/clients"
                  className="text-xs text-amber-500 hover:text-amber-400 font-medium inline-flex items-center gap-1"
                >
                  <span>View All Clients</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentClients.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No client records created yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {recentClients.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <Link
                          href={`/clients/${c.id}`}
                          className="font-semibold text-white hover:text-amber-400 transition block"
                        >
                          {c.clientName}
                        </Link>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-zinc-500" />
                          <span>{c.companyName || "Independent Client"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={c.status} type="client" />
                        <Link
                          href={`/clients/${c.id}`}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Orders / Client Commitments */}
          <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>{user.role === "CLIENT" ? "My Active Deliverables & Orders" : "Recent Commitments & Orders"}</span>
              </div>
              <Link
                href="/orders"
                className="text-xs text-amber-500 hover:text-amber-400 font-medium inline-flex items-center gap-1"
              >
                <span>{user.role === "CLIENT" ? "View My Orders" : "View All Orders"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                {user.role === "CLIENT"
                  ? "No active orders found for your client account."
                  : "No orders recorded yet. Create an order from a Client Profile."}
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {recentOrders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-semibold text-white hover:text-amber-400 transition block font-mono text-[11px]"
                      >
                        #{o.id.slice(0, 8)} &bull; {o.packageName}
                      </Link>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Client: <span className="text-zinc-200">{o.clientName}</span> ({o.contractedVideoCount} videos)
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium text-amber-400 text-xs">
                        ₹{Number(o.totalInvoiceAmount).toLocaleString()}
                      </span>
                      <StatusBadge status={o.status} type="order" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Launchpad - Role Scoped */}
        <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
            {user.role === "CLIENT" ? "Client Portal Quick Actions" : "Quick Navigation & Workspace Modules"}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {canViewClients && (
              <Link
                href="/clients"
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/50 transition flex flex-col gap-2"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-semibold text-white">Client Management</span>
                <span className="text-[11px] text-zinc-400">Profiles, lifecycle, contact info & history</span>
              </Link>
            )}

            <Link
              href="/orders"
              className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/50 transition flex flex-col gap-2"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-semibold text-white">
                {user.role === "CLIENT" ? "My Orders & Quota" : "Orders & Quotas"}
              </span>
              <span className="text-[11px] text-zinc-400">
                {user.role === "CLIENT"
                  ? "Track video production stage and quota usage"
                  : "Production pipeline, deliverables & balances"}
              </span>
            </Link>

            {canManagePackages && (
              <Link
                href="/packages"
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/50 transition flex flex-col gap-2"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit">
                  <Package className="w-4 h-4" />
                </div>
                <span className="font-semibold text-white">Commercial Packages</span>
                <span className="text-[11px] text-zinc-400">UGC service tiers, video counts & pricing</span>
              </Link>
            )}

            {canManageRBAC && (
              <Link
                href="/settings/roles"
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/50 transition flex flex-col gap-2"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="font-semibold text-white">RBAC Administration</span>
                <span className="text-[11px] text-zinc-400">Roles, user permissions & audit logs</span>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
