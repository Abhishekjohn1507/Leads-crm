"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { UserWithRole } from "@/lib/rbac/check";
import { AppNavbar, StatusBadge } from "@/components/navigation/app-navbar";
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Building,
  Mail,
  Phone,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface ClientListItem {
  id: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string | null;
  brandName: string | null;
  industry: string | null;
  status: string;
  assignedEmployeeName: string;
  orderCount: number;
  createdAt: string;
}

interface StatsData {
  total: number;
  new: number;
  onboarding: number;
  active: number;
  onHold: number;
}

export function ClientsListClient({ user }: { user: UserWithRole }) {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [stats, setStats] = useState<StatsData>({ total: 0, new: 0, onboarding: 0, active: 0, onHold: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/clients", window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (statusFilter) url.searchParams.set("status", statusFilter);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", "10");

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to load clients: ${res.statusText}`);
      }

      const data = await res.json();
      setClients(data.clients || []);
      setTotalPages(data.totalPages || 1);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-amber-500 selection:text-black">
      <AppNavbar userRole={user.role} userName={user.name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-amber-500" />
              Clients Management
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Centralized agency client accounts, company records, and commercial order lifecycles
            </p>
          </div>

          {user.role !== "CLIENT" && (
            <Link
              href="/clients/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Client</span>
            </Link>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4">
            <span className="text-[11px] text-zinc-400 font-medium">Total Clients</span>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4">
            <span className="text-[11px] text-zinc-400 font-medium">New</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">{stats.new}</div>
          </div>
          <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4">
            <span className="text-[11px] text-zinc-400 font-medium">Onboarding</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats.onboarding}</div>
          </div>
          <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4">
            <span className="text-[11px] text-zinc-400 font-medium">Active</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.active}</div>
          </div>
          <div className="bg-[#141414] border border-zinc-800 rounded-xl p-4 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-zinc-400 font-medium">On Hold</span>
            <div className="text-2xl font-bold text-orange-400 mt-1">{stats.onHold}</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-[#141414] border border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by client name, company, email, or brand..."
              className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#1A1A1E] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="">All Statuses</option>
              <option value="lead">Lead</option>
              <option value="new">New</option>
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Clients Table */}
        <div className="bg-[#141414] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-zinc-400">
              <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
              <span className="text-xs">Loading clients catalog...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users className="w-10 h-10 text-zinc-600 mx-auto" />
              <div className="text-sm font-semibold text-white">No clients found</div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No clients match your filter criteria or none have been onboarded yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#17171A] text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Client / Contact</th>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Industry / Brand</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {clients.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <Link
                          href={`/clients/${c.id}`}
                          className="hover:text-amber-400 transition-colors font-semibold"
                        >
                          {c.clientName}
                        </Link>
                        <div className="text-zinc-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span>{c.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-200">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                          <span>{c.companyName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        <div>{c.industry || "General"}</div>
                        {c.brandName && (
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            Brand: {c.brandName}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {c.assignedEmployeeName}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={c.status} type="client" />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[11px] text-zinc-300">
                          {c.orderCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/clients/${c.id}`}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="View Client Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {user.role !== "CLIENT" && (
                            <Link
                              href={`/clients/${c.id}/edit`}
                              className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Edit Client"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3.5 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-zinc-700 disabled:opacity-30 hover:bg-zinc-800 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-zinc-700 disabled:opacity-30 hover:bg-zinc-800 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
