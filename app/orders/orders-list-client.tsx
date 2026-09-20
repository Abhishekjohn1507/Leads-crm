"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Calendar, 
  Video, 
  ArrowUpRight, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  Building2, 
  User, 
  AlertCircle 
} from "lucide-react";
import { StatusBadge } from "@/components/navigation/app-navbar";

interface OrderItem {
  id: string;
  clientId: string;
  clientName: string;
  companyName: string | null;
  packageId: string | null;
  packageName: string;
  contractedVideoCount: number;
  pricing: number;
  taxRate: number;
  taxAmount: number;
  totalInvoiceAmount: number;
  amountReceived: number;
  outstandingBalance: number;
  startDate: string | null;
  dueDate: string | null;
  assignedTeam: string | null;
  status: string;
  createdAt: string;
  orderedVideos: number;
  remainingQuota: number;
}

interface OrdersListClientProps {
  currentUser: any;
  canCreate: boolean;
  canApply?: boolean;
}

const ORDER_STATUSES = [
  "ALL",
  "NEW",
  "ONBOARDING",
  "IN_PRODUCTION",
  "PARTIALLY_DELIVERED",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
];

export function OrdersListClient({ currentUser, canCreate, canApply }: OrdersListClientProps) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-500" />
            {currentUser?.role === "CLIENT" ? "My Orders & Deliverables" : "Orders & Commitments"}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track commercial deliverables, UGC video quotas, production stages, and billing totals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canApply && (
            <Link
              href="/packages"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-sm transition-colors shadow-sm"
            >
              + Order New Package
            </Link>
          )}
          {canCreate && (
            <Link
              href="/clients"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold rounded-lg text-sm transition-colors shadow-sm"
            >
              + Create Order (Via Client)
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by order ID, client name, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
          <div className="flex items-center gap-1">
            {ORDER_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  statusFilter === status
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {status.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
            <p className="text-sm">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-300">No Orders Found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== "ALL"
                ? "No orders match the specified filters."
                : currentUser?.role === "CLIENT"
                ? "You have no active orders yet. Browse packages to order your first UGC video commitment."
                : "Create an order from a Client Profile to begin tracking commercial deliverables."}
            </p>
            {canApply && !search && (
              <Link
                href="/packages"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition shadow-sm"
              >
                Browse & Order Packages
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/60 text-zinc-400 text-xs border-b border-zinc-800/80 font-medium">
                <tr>
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-5 py-3.5">Client & Company</th>
                  <th className="px-5 py-3.5">Package Tier</th>
                  <th className="px-5 py-3.5">Video Quota</th>
                  <th className="px-5 py-3.5">Total Commitment</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Assigned Team</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-amber-400 font-semibold">
                      #{ord.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/clients/${ord.clientId}`}
                        className="font-medium text-white hover:text-amber-400 transition"
                      >
                        {ord.clientName}
                      </Link>
                      {ord.companyName && (
                        <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-zinc-500" />
                          {ord.companyName}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-zinc-200">
                      {ord.packageName}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <span className="font-semibold text-zinc-200 flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-amber-500" />
                        {ord.contractedVideoCount} Videos
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {ord.remainingQuota} remaining
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono font-medium text-zinc-200">
                      ₹{Number(ord.totalInvoiceAmount).toLocaleString()}
                      <div className="text-[11px] text-zinc-400 font-sans">
                        Bal: ₹{Number(ord.outstandingBalance).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400">
                      {ord.dueDate ? new Date(ord.dueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400">
                      {ord.assignedTeam || "Unassigned"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={ord.status} type="order" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/orders/${ord.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-xs font-medium transition"
                      >
                        Details
                        <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Showing {orders.length} of {totalCount} commitments
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono text-zinc-300">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
