"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Mail,
  Trash2,
  X,
  Building,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  Clock,
  Calendar,
  KeyRound,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";

interface User {
  id: string;
  tenant_id: string;
  clerk_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: string;
  last_login_at?: string;
  created_at: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  error_details: string[];
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; className: string }> = {
    platform_admin: {
      label: "Platform Admin",
      className:
        "bg-purple-950/40 text-purple-300 border border-purple-700/40",
    },
    "org:admin": {
      label: "Org Admin",
      className: "bg-blue-950/40 text-blue-300 border border-blue-700/40",
    },
    "org:member": {
      label: "Member",
      className: "bg-slate-800 text-slate-400 border border-slate-700/40",
    },
  };
  const config = map[role] ?? {
    label: role.replace("org:", "").toUpperCase(),
    className: "bg-slate-800 text-slate-400 border border-slate-700/40",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
        status === "active"
          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-700/40"
          : "bg-red-950/40 text-red-400 border border-red-700/40"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UsersView() {
  const queryClient = useQueryClient();
  const { authFetch } = useApi();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    tenant_id: "",
    role: "org:member",
  });
  const [inviteStatus, setInviteStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [selectedUserForAssign, setSelectedUserForAssign] = useState<User | null>(null);
  const [assignForm, setAssignForm] = useState({
    tenant_id: "",
    role: "org:member",
  });
  const [assignStatus, setAssignStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleOpenAssignModal = (user: User) => {
    setSelectedUserForAssign(user);
    setAssignForm({
      tenant_id: user.tenant_id || "",
      role: user.role || "org:member",
    });
    setAssignStatus(null);
  };

  // Fetch live users
  const {
    data: users = [],
    isLoading,
  } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Fetch tenants for dropdown
  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["admin-tenants-simple"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/tenants");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      return res.json();
    },
  });

  // Sync users mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/v1/system/admin/sync-clerk-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Sync failed");
      }
      return res.json() as Promise<SyncResult>;
    },
    onSuccess: (result) => {
      setSyncResult(result);
      setSyncError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      setSyncError(err.message);
      setSyncResult(null);
    },
  });

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: async (formData: typeof inviteForm) => {
      const res = await authFetch("/api/v1/system/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to invite user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setInviteStatus({
        type: "success",
        message: `Successfully invited ${inviteForm.email}! An invitation email has been sent.`,
      });
      setInviteForm({ email: "", first_name: "", last_name: "", tenant_id: "", role: "org:member" });
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteStatus(null);
      }, 3000);
    },
    onError: (err: Error) => {
      setInviteStatus({ type: "error", message: err.message });
    },
  });

  // Assign organization mutation
  const assignMutation = useMutation({
    mutationFn: async ({ userId, tenant_id, role }: { userId: string; tenant_id: string; role: string }) => {
      const res = await authFetch(`/api/v1/system/users/${userId}/assign-organization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant_id || null, role }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to assign organization");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setAssignStatus({
        type: "success",
        message: "Organization and role updated successfully!",
      });
      setTimeout(() => {
        setSelectedUserForAssign(null);
        setAssignStatus(null);
      }, 2000);
    },
    onError: (err: Error) => {
      setAssignStatus({ type: "error", message: err.message });
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || !inviteForm.role) return;
    if (inviteForm.role !== "platform_admin" && !inviteForm.tenant_id) {
      setInviteStatus({
        type: "error",
        message: "Please select an organization for this user role.",
      });
      return;
    }
    setInviteStatus(null);
    inviteMutation.mutate(inviteForm);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.clerk_user_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesTenant = tenantFilter === "all" || user.tenant_id === tenantFilter;
    return matchesSearch && matchesRole && matchesTenant;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Identity & Users Control</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">
            Synchronized with Clerk — view profiles, roles, and organization memberships across all tenants.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync button */}
          <button
            id="sync-clerk-users-btn"
            onClick={() => {
              setSyncResult(null);
              setSyncError(null);
              syncMutation.mutate();
            }}
            disabled={syncMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            <span>{syncMutation.isPending ? "Syncing…" : "Sync from Clerk"}</span>
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
          >
            <Plus className="h-4 w-4" />
            <span>Invite User</span>
          </button>
        </div>
      </div>

      {/* Sync result banner */}
      <AnimatePresence>
        {syncResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-3"
          >
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Clerk sync complete</p>
              <p>
                {syncResult.synced} users synced —{" "}
                <span className="text-emerald-200">{syncResult.created} created</span>,{" "}
                {syncResult.updated} updated, {syncResult.skipped} skipped without org
                {syncResult.errors > 0 && (
                  <span className="text-amber-400">, {syncResult.errors} errors</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setSyncResult(null)}
              className="ml-auto p-1 hover:bg-emerald-900/30 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
        {syncError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-xs text-red-300 flex items-start gap-3"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <p><span className="font-bold">Sync failed:</span> {syncError}</p>
            <button onClick={() => setSyncError(null)} className="ml-auto p-1 hover:bg-red-900/30 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search email, name, Clerk user ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
          >
            <option value="all">All Roles</option>
            <option value="platform_admin">Platform Admin</option>
            <option value="org:admin">Org Admin</option>
            <option value="org:member">Org Member</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Workspace:</span>
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
          >
            <option value="all">All Workspaces</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-450 animate-pulse">
            Loading identity databases…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-450">
              No users found. Click <strong>Sync from Clerk</strong> to import all Clerk users.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-250 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <KeyRound className="h-3 w-3" /> Clerk ID
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Role
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Last Login
                    </div>
                  </th>
                  <th className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Created
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredUsers.map((user) => {
                  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "?";
                  const orgName =
                    tenants.find((t) => t.id === user.tenant_id)?.name || (
                      <span className="text-slate-400 italic">Unassigned</span>
                    );
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-all duration-200"
                    >
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-600/5 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-bold block">
                              {user.first_name
                                ? `${user.first_name} ${user.last_name || ""}`
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 font-semibold text-slate-650 dark:text-slate-350 max-w-[180px] truncate">
                        {user.email}
                      </td>

                      {/* Clerk User ID */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {user.clerk_user_id}
                        </span>
                      </td>

                      {/* Organization */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{orgName}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5">
                        <RoleBadge role={user.role} />
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={user.status} />
                      </td>

                      {/* Last Login */}
                      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                        {formatDateTime(user.last_login_at)}
                      </td>

                      {/* Created */}
                      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAssignModal(user)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all border border-slate-200 dark:border-slate-750"
                        >
                          Change Org
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!inviteMutation.isPending) setShowInviteModal(false);
              }}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl z-50 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-sm">Send Platform Invitation</span>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {inviteStatus && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 text-xs leading-normal ${
                    inviteStatus.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-850 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-50 border-red-200 text-red-850 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400"
                  }`}
                >
                  {inviteStatus.type === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-650" />
                  )}
                  <span>{inviteStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">First Name</label>
                    <input
                      type="text"
                      value={inviteForm.first_name}
                      onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                      placeholder="Amit"
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Last Name</label>
                    <input
                      type="text"
                      value={inviteForm.last_name}
                      onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                      placeholder="Kumar"
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Security Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) =>
                      setInviteForm({
                        ...inviteForm,
                        role: e.target.value,
                        tenant_id:
                          e.target.value === "platform_admin"
                            ? "system"
                            : inviteForm.tenant_id,
                      })
                    }
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  >
                    <option value="org:member">Organization Member</option>
                    <option value="org:admin">Organization Admin</option>
                    <option value="platform_admin">Platform Admin</option>
                  </select>
                </div>

                {inviteForm.role !== "platform_admin" && (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Target Workspace</label>
                    <select
                      required
                      value={inviteForm.tenant_id}
                      onChange={(e) => setInviteForm({ ...inviteForm, tenant_id: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    >
                      <option value="">— Select Organization —</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    disabled={inviteMutation.isPending}
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                  >
                    {inviteMutation.isPending ? "Inviting…" : "Send Invitation"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Assign Organization Modal */}
      <AnimatePresence>
        {selectedUserForAssign && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!assignMutation.isPending) setSelectedUserForAssign(null);
              }}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-880 rounded-2xl p-6 shadow-xl z-50 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-sm">Assign Organization & Role</span>
                </div>
                <button
                  onClick={() => setSelectedUserForAssign(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850 space-y-1">
                <p><strong>User:</strong> {selectedUserForAssign.first_name ? `${selectedUserForAssign.first_name} ${selectedUserForAssign.last_name || ""}` : "—"}</p>
                <p><strong>Email:</strong> {selectedUserForAssign.email}</p>
              </div>

              {assignStatus && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 text-xs leading-normal ${
                    assignStatus.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-850 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-50 border-red-200 text-red-850 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400"
                  }`}
                >
                  {assignStatus.type === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-650" />
                  )}
                  <span>{assignStatus.message}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  assignMutation.mutate({
                    userId: selectedUserForAssign.id,
                    tenant_id: assignForm.tenant_id,
                    role: assignForm.role,
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Target Workspace / Organization</label>
                  <select
                    value={assignForm.tenant_id}
                    onChange={(e) => setAssignForm({ ...assignForm, tenant_id: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  >
                    <option value="">— Unassigned (No Organization) —</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Security Role</label>
                  <select
                    value={assignForm.role}
                    onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  >
                    <option value="org:member">Organization Member</option>
                    <option value="org:admin">Organization Admin</option>
                    <option value="platform_admin">Platform Admin</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    disabled={assignMutation.isPending}
                    onClick={() => setSelectedUserForAssign(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                  >
                    {assignMutation.isPending ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
