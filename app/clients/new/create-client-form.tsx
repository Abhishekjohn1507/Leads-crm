"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserWithRole } from "@/lib/rbac/check";
import { AppNavbar } from "@/components/navigation/app-navbar";
import {
  Users,
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Briefcase,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export function CreateClientForm({
  user,
  employees,
}: {
  user: UserWithRole;
  employees: Array<{ id: string; full_name: string; email: string }>;
}) {
  const router = useRouter();

  // Canonical Form State: companyName enforced across application contract
  const [formData, setFormData] = useState({
    clientName: "",
    companyName: "",
    email: "",
    phone: "",
    whatsapp: "",
    brandName: "",
    industry: "",
    gstTaxId: "",
    assignedEmployeeId: "",
    source: "Website Inbound",
    notes: "",
    status: "LEAD",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validation
    if (!formData.clientName.trim()) {
      setError("Client Name is required.");
      return;
    }

    if (!formData.companyName.trim()) {
      setError("Company Name is required.");
      return;
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("A valid Email address is required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          assignedEmployeeId: formData.assignedEmployeeId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create client.");
      }

      // Redirect to newly created client profile
      router.push(`/clients/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-amber-500 selection:text-black">
      <AppNavbar userRole={user.role} userName={user.name} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Onboard New Client
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Create a new client account using the canonical company contract
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Core Identification */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                1. Core Account & Company
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Client Name <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="e.g. Alex Henderson"
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Company Name <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Acme Media Corp"
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Business / Brand Name
                  </label>
                  <input
                    type="text"
                    disabled={loading}
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="e.g. GlowSkin Organics"
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Industry / Niche
                  </label>
                  <input
                    type="text"
                    disabled={loading}
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Beauty & Skincare, SaaS, E-commerce"
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                2. Contact & Communications
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Official Work Email <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="alex@acme.com"
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    disabled={loading}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    disabled={loading}
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Operations & Tax */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                3. Assignment & Operations
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    GST / Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    disabled={loading}
                    value={formData.gstTaxId}
                    onChange={(e) => setFormData({ ...formData, gstTaxId: e.target.value })}
                    placeholder="27AAAPA1234A1Z5"
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Assigned Account Exec
                  </label>
                  <select
                    disabled={loading}
                    value={formData.assignedEmployeeId}
                    onChange={(e) => setFormData({ ...formData, assignedEmployeeId: e.target.value })}
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">Select an employee (optional)</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Initial Client Status
                  </label>
                  <select
                    disabled={loading}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer font-semibold"
                  >
                    <option value="LEAD">LEAD</option>
                    <option value="NEW">NEW</option>
                    <option value="ONBOARDING">ONBOARDING</option>
                    <option value="ACTIVE">ACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Internal Agency Notes
                </label>
                <textarea
                  rows={3}
                  disabled={loading}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key brand guidelines, initial goals, special requests..."
                  className="w-full bg-[#1A1A1E] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
              <Link
                href="/clients"
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Client...</span>
                  </>
                ) : (
                  <>
                    <span>Create Client</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
