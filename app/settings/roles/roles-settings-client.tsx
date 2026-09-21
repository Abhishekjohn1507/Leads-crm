"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Role, Permission, ROLES, ROLE_PERMISSIONS, ALL_PERMISSIONS } from "@/lib/rbac/permissions";
import { UserWithRole, hasPermission } from "@/lib/rbac/check";
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Lock,
  Play,
  Zap,
  Info,
  Sliders,
  Check,
  Building,
} from "lucide-react";

interface RolesSettingsClientProps {
  currentUser: UserWithRole;
  initialUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    clientId: string | null;
    createdAt: string;
  }>;
}

export function RolesSettingsClient({
  currentUser,
  initialUsers,
}: RolesSettingsClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<Role>("OWNER");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Live Permission Test Runner state
  const [testPermission, setTestPermission] = useState<Permission>("lead:create");
  const [testClientId, setTestClientId] = useState<string>("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Handle role change via protected API
  const handleRoleChange = async (targetUserId: string, newRole: Role) => {
    setUpdatingUserId(targetUserId);
    try {
      const res = await fetch("/api/rbac/test-permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, newRole }),
      });

      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
        );
      } else {
        alert(data.error || "Failed to update role");
      }
    } catch {
      alert("Network error updating user role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Run Server-side Permission Check Test
  const runLiveTest = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const url = new URL("/api/rbac/test-permission", window.location.origin);
      url.searchParams.set("permission", testPermission);
      if (testClientId.trim()) {
        url.searchParams.set("targetClientId", testClientId.trim());
      }

      const res = await fetch(url.toString());
      const data = await res.json();
      setTestResult({
        status: res.status,
        ok: res.ok,
        data,
      });
    } catch (err: any) {
      setTestResult({
        status: 500,
        ok: false,
        data: { error: err.message },
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-amber-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#121212]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold text-base tracking-tight">
                Leadyfy OS &bull; RBAC Administration
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center gap-2">
              <span className="text-zinc-400">Current Role:</span>
              <span className="font-bold text-amber-400">{currentUser.role}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              Role-Based Access Control (RBAC) Architecture
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Step 2 enforces 7 Leadyfy roles with server-side permission validation and strict client isolation. All operations are enforced server-side before execution.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono">
              7 Roles Defined
            </span>
            <span className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
              {ALL_PERMISSIONS.length} Permissions
            </span>
          </div>
        </div>

        {/* Section 1: Live Server Authorization Tester */}
        <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Play className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Live Server Authorization Test Runner</h2>
                <p className="text-xs text-zinc-400">
                  Directly invoke the backend authorization guard (`requirePermission` & `validateClientAccess`)
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-500">API: /api/rbac/test-permission</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Test Requested Permission
              </label>
              <select
                value={testPermission}
                onChange={(e) => setTestPermission(e.target.value as Permission)}
                className="w-full bg-[#1A1A1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              >
                {ALL_PERMISSIONS.map((perm) => (
                  <option key={perm} value={perm}>
                    {perm}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Test Target Client ID (Optional for Client Isolation)
              </label>
              <input
                type="text"
                value={testClientId}
                onChange={(e) => setTestClientId(e.target.value)}
                placeholder="UUID of target client (e.g. 1111-2222...)"
                className="w-full bg-[#1A1A1E] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={runLiveTest}
                disabled={testLoading}
                className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {testLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-black" />
                )}
                <span>Run Authorization Check</span>
              </button>
            </div>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs animate-in fade-in duration-200 ${
                testResult.ok
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-red-500/10 border-red-500/20 text-red-300"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                {testResult.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Access Granted (HTTP {testResult.status} OK)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Access Denied (HTTP {testResult.status} Forbidden)</span>
                  </>
                )}
              </div>
              <pre className="p-3 bg-black/40 rounded-lg font-mono text-[11px] overflow-x-auto text-zinc-300">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Section 2: Active Users & Live Role Assignments */}
        <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-zinc-800 text-amber-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Agency Users & Role Assignment</h2>
                <p className="text-xs text-zinc-400">
                  Switch user roles dynamically to test and verify permission enforcement across roles
                </p>
              </div>
            </div>
            <span className="text-xs text-zinc-500">{users.length} Users</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Current Role</th>
                  <th className="py-2.5 px-3">Client Isolation ID</th>
                  <th className="py-2.5 px-3">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                      <span>{u.name}</span>
                      {u.id === currentUser.id && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-400">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-amber-400 border border-zinc-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-500">
                      {u.clientId ? u.clientId : "None (Internal)"}
                    </td>
                    <td className="py-3 px-3">
                      {u.role === "OWNER" && currentUser.role !== "OWNER" ? (
                        <span className="text-[11px] text-zinc-500 italic flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-500" /> Protected (Owner)
                        </span>
                      ) : (
                        <select
                          disabled={updatingUserId === u.id}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          className="bg-[#1A1A1E] border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      )}
                      {updatingUserId === u.id && (
                        <span className="ml-2 text-zinc-400 animate-pulse text-[10px]">
                          Updating...
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Comprehensive Role -> Permission Matrix */}
        <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-zinc-800 text-amber-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Role Permission Matrix (Leadyfy OS Specification)</h2>
                <p className="text-xs text-zinc-400">
                  Select a role to inspect its allowed operational permissions
                </p>
              </div>
            </div>

            {/* Role Pills */}
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoleForMatrix(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedRoleForMatrix === r
                      ? "bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white">Selected Role: {selectedRoleForMatrix}</span>
                <p className="text-[11px] text-zinc-400">
                  {selectedRoleForMatrix === "OWNER"
                    ? "Full system access (safe wildcard * on server authorization)"
                    : selectedRoleForMatrix === "ADMIN"
                    ? "Operational administrative access across all business modules"
                    : selectedRoleForMatrix === "CLIENT"
                    ? "Strictly isolated to client portal; blocked from all internal agency data"
                    : `Scoped to ${selectedRoleForMatrix.toLowerCase()} agency workflow`}
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">
                {selectedRoleForMatrix === "OWNER"
                  ? "All Permissions Granted (*)"
                  : `${(ROLE_PERMISSIONS[selectedRoleForMatrix] as Permission[]).length} Permissions`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
              {ALL_PERMISSIONS.map((perm) => {
                const granted = hasPermission(selectedRoleForMatrix, perm);
                return (
                  <div
                    key={perm}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      granted
                        ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-300"
                        : "bg-zinc-900/30 border-zinc-800/80 text-zinc-500 opacity-60"
                    }`}
                  >
                    <span className="font-mono text-[11px]">{perm}</span>
                    {granted ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
