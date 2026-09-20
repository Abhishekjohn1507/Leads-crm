"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserWithRole } from "@/lib/rbac/check";
import { AppNavbar, StatusBadge } from "@/components/navigation/app-navbar";
import { CLIENT_STATUSES, ClientStatus } from "@/lib/clients/status";
import {
  Users,
  Building,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Plus,
  Edit2,
  ArrowLeft,
  Activity,
  CheckCircle,
  Clock,
  Layers,
  FileText,
  AlertCircle,
  Loader2,
  X,
  Zap,
} from "lucide-react";

interface ClientProfileClientProps {
  user: UserWithRole;
  client: any;
  orders: any[];
  packages: any[];
  activities: any[];
}

export function ClientProfileClient({
  user,
  client,
  orders,
  packages,
  activities,
}: ClientProfileClientProps) {
  const router = useRouter();

  // Status transition modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus>(client.status);
  const [statusNotes, setStatusNotes] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Quick Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.id || "");
  const [customVideoCount, setCustomVideoCount] = useState<number>(Number(packages[0]?.videoCount || 10));
  const [customPricing, setCustomPricing] = useState<number>(Number(packages[0]?.basePrice || 25000));
  const [taxRate] = useState<number>(18);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Calculate live financial preview for order modal
  const numericPricing = Number(customPricing) || 0;
  const numericTaxRate = Number(taxRate) || 0;
  const taxAmount = Number(((numericPricing * numericTaxRate) / 100).toFixed(2));
  const totalInvoiceAmount = Number((numericPricing + taxAmount).toFixed(2));

  const handlePackageSelect = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const pkg = packages.find((p) => p.id === pkgId);
    if (pkg) {
      setCustomVideoCount(Number(pkg.videoCount || 10));
      setCustomPricing(Number(pkg.basePrice || 0));
    }
  };

  const handleStatusUpdate = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus, notes: statusNotes }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update client status");
      }

      setShowStatusModal(false);
      router.refresh();
    } catch (err: any) {
      setStatusError(err.message || "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderLoading(true);
    setOrderError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          packageId: selectedPackageId || null,
          contractedVideoCount: customVideoCount,
          pricing: customPricing,
          taxRate,
          startDate,
          dueDate: dueDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      setShowOrderModal(false);
      router.push(`/orders/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setOrderError(err.message || "Failed to create order");
      setOrderLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-amber-500 selection:text-black">
      <AppNavbar userRole={user.role} userName={user.name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Header Card */}
        <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Link
                  href="/clients"
                  className="p-1.5 -ml-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl font-bold text-white tracking-tight">{client.clientName}</h1>
                <StatusBadge status={client.status} type="client" />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                  <Building className="w-3.5 h-3.5 text-amber-500" />
                  {client.companyName}
                </span>
                {client.brandName && (
                  <span className="text-zinc-400 font-mono">Brand: {client.brandName}</span>
                )}
                <span>&bull;</span>
                <span>{client.industry || "General Industry"}</span>
                <span>&bull;</span>
                <span className="text-zinc-500">
                  Onboarded: {new Date(client.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {user.role !== "CLIENT" && (
                <>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-all cursor-pointer"
                  >
                    Change Status
                  </button>
                  <Link
                    href={`/clients/${client.id}/edit`}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Edit Client</span>
                  </Link>
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Order</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content Columns: Info & Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Contact & Company Details */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Contact Information
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-500">Email</span>
                  <span className="font-mono text-white select-all">{client.email}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-500">Phone</span>
                  <span className="font-mono text-zinc-300">{client.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-500">WhatsApp</span>
                  <span className="font-mono text-zinc-300">{client.whatsapp || "Not provided"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-zinc-500">Lead Source</span>
                  <span className="text-zinc-300">{client.source || "Organic / Direct"}</span>
                </div>
              </div>
            </div>

            {/* Company & Operations Card */}
            <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-3.5 h-3.5" />
                Company & Operations
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-500">Company Name</span>
                  <span className="font-medium text-white">{client.companyName}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-500">Brand Name</span>
                  <span className="font-medium text-zinc-300">{client.brandName || "Same as company"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-500">GST / Tax ID</span>
                  <span className="font-mono text-zinc-300">{client.gstTaxId || "Not Registered"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-zinc-500">Assigned Lead</span>
                  <span className="font-medium text-amber-400">{client.assignedEmployeeName}</span>
                </div>
              </div>

              {client.notes && (
                <div className="pt-3 border-t border-zinc-800 text-xs">
                  <span className="text-zinc-500 block mb-1">Agency Notes:</span>
                  <p className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 text-zinc-300 text-[11px] leading-relaxed">
                    {client.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Assets Placeholder Section */}
            <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                  Brand Assets
                </h2>
                <span className="text-[10px] text-zinc-500">Asset Module (Step 5)</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Brand kit assets, logos, fonts, and guidelines will be managed here.
              </p>
            </div>
          </div>

          {/* Right Column: Orders & Activity Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Orders Section */}
            <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Commercial Orders</h2>
                    <p className="text-xs text-zinc-400">
                      All historical and active production commitments for {client.clientName}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono text-zinc-400 px-2 py-0.5 bg-zinc-800 rounded border border-zinc-700">
                  {orders.length} {orders.length === 1 ? "Order" : "Orders"}
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <ShoppingBag className="w-8 h-8 text-zinc-600 mx-auto" />
                  <div className="text-xs font-medium text-zinc-400">No orders placed yet</div>
                  {user.role !== "CLIENT" && (
                    <button
                      onClick={() => setShowOrderModal(true)}
                      className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      + Create First Order
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <Link
                      key={ord.id}
                      href={`/orders/${ord.id}`}
                      className="block p-4 rounded-xl bg-[#18181C] border border-zinc-800 hover:border-amber-500/40 transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white group-hover:text-amber-400 transition-colors">
                              {ord.packageName}
                            </span>
                            <StatusBadge status={ord.status} type="order" />
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                            <span>Contracted: {ord.contractedVideoCount} Videos</span>
                            <span>&bull;</span>
                            <span>Quota Left: {ord.remainingQuota}</span>
                            <span>&bull;</span>
                            <span>Start: {new Date(ord.startDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-sm text-white">
                            ₹{Number(ord.totalInvoiceAmount).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            Outstanding: ₹{Number(ord.outstandingBalance).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Activity History */}
            <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-zinc-800/80 pb-4">
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Audit & Activity Log</h2>
                  <p className="text-xs text-zinc-400">Recorded system events and status changes</p>
                </div>
              </div>

              {activities.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">No recorded activity yet.</div>
              ) : (
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-start justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-mono text-amber-400 text-[11px] font-semibold">
                          {act.action}
                        </span>
                        {act.metadata?.from && act.metadata?.to && (
                          <div className="text-[11px] text-zinc-400">
                            Transitioned from <span className="text-white">{act.metadata.from}</span> to{" "}
                            <span className="text-white">{act.metadata.to}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Status Transition Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white">Change Client Status</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium">Current Status</label>
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 font-semibold text-zinc-300">
                  {client.status}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium">Select Target Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ClientStatus)}
                  className="w-full bg-[#1A1A1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                >
                  {CLIENT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium">Transition Reason / Notes</label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Optional context for this status change..."
                  className="w-full bg-[#1A1A1E] border border-zinc-700 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-3.5 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={statusLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {statusLoading ? "Updating..." : "Confirm Status Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Create Commercial Order</h3>
                <p className="text-xs text-zinc-400 mt-0.5">For Client: {client.clientName} ({client.companyName})</p>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {orderError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              {/* Package Selector */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">Select Commercial Package</label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => handlePackageSelect(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Custom Package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.videoCount} Videos &bull; ₹{Number(pkg.basePrice).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">Contracted Videos</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={customVideoCount}
                    onChange={(e) => setCustomVideoCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#1A1A1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">Base Pricing (₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={customPricing}
                    onChange={(e) => setCustomPricing(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1A1A1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#1A1A1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#1A1A1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Calculated Financial Summary Preview */}
              <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
                <span className="font-semibold text-zinc-400 block text-[11px] uppercase tracking-wider">
                  Calculated Financial Breakdown
                </span>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Base Pricing:</span>
                  <span className="font-mono text-zinc-200">₹{customPricing.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>GST Tax (18%):</span>
                  <span className="font-mono text-zinc-200">₹{taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-zinc-800 text-white">
                  <span>Total Invoice Amount:</span>
                  <span className="font-mono text-amber-400">₹{totalInvoiceAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Initial Outstanding Balance:</span>
                  <span className="font-mono">₹{totalInvoiceAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-3.5 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderLoading}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {orderLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Create Order</span>
                      <CheckCircle className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
