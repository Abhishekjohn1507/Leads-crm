"use client";

import { useState, useEffect } from "react";
import { 
  Package, 
  Plus, 
  Video, 
  Percent, 
  IndianRupee, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Edit3, 
  Search,
  AlertCircle
} from "lucide-react";

interface PackageItem {
  id: string;
  name: string;
  description: string | null;
  videoCount: number;
  basePrice: number;
  taxRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PackagesClientProps {
  canCreate: boolean;
  canUpdate: boolean;
  canApply?: boolean;
  userRole?: string;
}

export function PackagesClient({ canCreate, canUpdate, canApply, userRole }: PackagesClientProps) {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageItem | null>(null);

  // Apply modal state for client self-service
  const [applyPkg, setApplyPkg] = useState<PackageItem | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyStartDate, setApplyStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [applyDueDate, setApplyDueDate] = useState("");
  const [applyNotes, setApplyNotes] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    videoCount: 10,
    basePrice: 25000,
    taxRate: 18,
    isActive: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/packages");
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error("Failed to load packages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openApplyModal = (pkg: PackageItem) => {
    setApplyPkg(pkg);
    setApplyStartDate(new Date().toISOString().split("T")[0]);
    setApplyDueDate("");
    setApplyNotes("");
    setApplyError("");
    setApplySuccess(false);
    setShowApplyModal(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyPkg) return;
    setApplyError("");
    setApplySubmitting(true);

    try {
      const res = await fetch("/api/orders/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: applyPkg.id,
          startDate: applyStartDate,
          dueDate: applyDueDate || null,
          notes: applyNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit package application.");
      }

      setApplySuccess(true);
      setTimeout(() => {
        setShowApplyModal(false);
        setApplySuccess(false);
        window.location.href = `/orders/${data.order.id}`;
      }, 1200);
    } catch (err: any) {
      setApplyError(err.message || "Failed to submit application.");
    } finally {
      setApplySubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingPkg(null);
    setFormData({
      name: "",
      description: "",
      videoCount: 10,
      basePrice: 25000,
      taxRate: 18,
      isActive: true,
    });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (pkg: PackageItem) => {
    setEditingPkg(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      videoCount: pkg.videoCount,
      basePrice: pkg.basePrice,
      taxRate: pkg.taxRate,
      isActive: pkg.isActive,
    });
    setFormError("");
    setShowModal(true);
  };

  const handleToggleActive = async (pkg: PackageItem) => {
    if (!canUpdate) return;
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      if (res.ok) {
        fetchPackages();
      }
    } catch (err) {
      console.error("Failed to toggle package status:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSubmitting(true);

    try {
      const url = editingPkg ? `/api/packages/${editingPkg.id}` : "/api/packages";
      const method = editingPkg ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save package");
        setFormSubmitting(false);
        return;
      }

      setShowModal(false);
      fetchPackages();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredPackages = packages.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Packages
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage commercial UGC service tiers, contracted video quotas, and pricing.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Package
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="text-xs text-zinc-500">
          Showing {filteredPackages.length} of {packages.length} packages
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
          <p className="text-sm">Loading packages catalog...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 rounded-xl border border-zinc-800/80">
          <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-300">No Packages Found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            {search ? "No packages match your search filter." : "Create your first UGC package tier to start issuing orders."}
          </p>
          {canCreate && !search && (
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-zinc-950 rounded-lg text-xs font-semibold hover:bg-amber-400 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Package
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPackages.map((pkg) => {
            const taxAmount = (pkg.basePrice * pkg.taxRate) / 100;
            const totalWithTax = pkg.basePrice + taxAmount;

            return (
              <div
                key={pkg.id}
                className={`relative flex flex-col justify-between p-6 rounded-xl border transition-all ${
                  pkg.isActive
                    ? "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 shadow-sm"
                    : "bg-zinc-950/40 border-zinc-900 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">{pkg.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {pkg.description || "Standard commercial delivery package."}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        pkg.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      }`}
                    >
                      {pkg.isActive ? "Active" : "Archived"}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between text-sm py-2 border-y border-zinc-800/80">
                      <span className="text-zinc-400 flex items-center gap-1.5 text-xs">
                        <Video className="w-3.5 h-3.5 text-amber-500" />
                        Video Quota
                      </span>
                      <span className="font-semibold text-zinc-200">{pkg.videoCount} Videos</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Base Rate:</span>
                        <span className="font-mono text-zinc-200">₹{Number(pkg.basePrice).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Tax ({pkg.taxRate}%):</span>
                        <span className="font-mono text-zinc-400">₹{taxAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-zinc-800">
                        <span className="text-zinc-300">Total Commitment:</span>
                        <span className="font-mono text-amber-400">₹{totalWithTax.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/70 flex flex-col gap-2">
                  {canApply && pkg.isActive && (
                    <button
                      onClick={() => openApplyModal(pkg)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Apply for Package
                    </button>
                  )}

                  {canUpdate && (
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button
                        onClick={() => openEditModal(pkg)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                        Edit Package
                      </button>
                      <button
                        onClick={() => handleToggleActive(pkg)}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition ${
                          pkg.isActive
                            ? "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                            : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        }`}
                      >
                        {pkg.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                {editingPkg ? "Edit Package" : "Create New Package"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. UGC Growth Tier"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details regarding deliverables, revisions, or target outputs..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Video Count *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.videoCount}
                    onChange={(e) => setFormData({ ...formData, videoCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tax Rate (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Total Calculated Gross Amount:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  ₹{(formData.basePrice + (formData.basePrice * formData.taxRate) / 100).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded bg-zinc-950 border-zinc-800 text-amber-500 focus:ring-0"
                />
                <label htmlFor="isActiveToggle" className="text-xs text-zinc-300 select-none cursor-pointer">
                  Available for new client orders (Active)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-xs transition disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingPkg ? "Save Changes" : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply for Package Modal (Client Self-Service) */}
      {showApplyModal && applyPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  Apply for {applyPkg.name}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Confirm your UGC package application to begin onboarding & production.
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            {applyError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            {applySuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-base font-bold text-white">Application Submitted!</h3>
                <p className="text-xs text-zinc-400">
                  Redirecting to your order detail and video quota tracker...
                </p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                {/* Summary Box */}
                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Video Quota:</span>
                    <span className="font-semibold text-white flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-amber-500" />
                      {applyPkg.videoCount} Contracted Videos
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Base Price:</span>
                    <span className="font-mono text-zinc-200">
                      ₹{Number(applyPkg.basePrice).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">GST Tax ({applyPkg.taxRate}%):</span>
                    <span className="font-mono text-zinc-400">
                      ₹{((applyPkg.basePrice * applyPkg.taxRate) / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-sm font-semibold">
                    <span className="text-zinc-200">Total Commitment:</span>
                    <span className="font-mono text-amber-400">
                      ₹{(applyPkg.basePrice + (applyPkg.basePrice * applyPkg.taxRate) / 100).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Preferred Start Date
                    </label>
                    <input
                      type="date"
                      value={applyStartDate}
                      onChange={(e) => setApplyStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Target Delivery Due Date
                    </label>
                    <input
                      type="date"
                      value={applyDueDate}
                      onChange={(e) => setApplyDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Campaign Goals / Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide context on your upcoming product launch, target angles, or marketing timeline..."
                    value={applyNotes}
                    onChange={(e) => setApplyNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applySubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
                  >
                    {applySubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm & Apply
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
