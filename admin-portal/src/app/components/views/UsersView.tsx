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
  Edit2,
  Copy,
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
      className: "bg-slate-850 text-slate-400 border border-slate-700/40",
    },
  };
  const config = map[role] ?? {
    label: role.replace("org:", "").toUpperCase(),
    className: "bg-slate-850 text-slate-400 border border-slate-700/40",
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

  // For showing credentials of newly created user
  const [newlyCreatedCreds, setNewlyCreatedCreds] = useState<{
    email: string;
    tempPass: string;
  } | null>(null);

  // Edit user state
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    tenant_id: "",
    role: "org:member",
    status: "active",
    password: "",
  });
  const [editStatus, setEditStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Delete confirmation state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch live users
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Fetch organizations list
  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["admin-tenants-list"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/organizations");
      if (!res.ok) throw new Error("Failed to fetch organizations");
      const data = await res.json();
      return data.map((d: any) => ({ id: d.id, name: d.name }));
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setInviteStatus(null);
      setNewlyCreatedCreds({
        email: inviteForm.email,
        tempPass: data.temp_password || "DefaultPass123!",
      });
      // Reset form
      setInviteForm({ email: "", first_name: "", last_name: "", tenant_id: "", role: "org:member" });
    },
    onError: (err: Error) => {
      setInviteStatus({ type: "error", message: err.message });
    },
  });

  // Edit/Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: typeof editForm) => {
      const res = await authFetch(`/api/v1/system/users/${selectedUserForEdit?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          first_name: payload.first_name,
          last_name: payload.last_name,
          role: payload.role,
          status: payload.status,
          password: payload.password || undefined,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update user");
      }

      // Also assign organization if role is not platform_admin
      const assignRes = await authFetch(`/api/v1/system/users/${selectedUserForEdit?.id}/assign-organization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: payload.role === "platform_admin" ? null : payload.tenant_id || null,
          role: payload.role,
        }),
      });
      if (!assignRes.ok) {
        const errorData = await assignRes.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to assign organization");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditStatus({
        type: "success",
        message: "User account updated successfully!",
      });
      setTimeout(() => {
        setSelectedUserForEdit(null);
        setEditStatus(null);
      }, 1500);
    },
    onError: (err: Error) => {
      setEditStatus({ type: "error", message: err.message });
    },
  });

  // Delete user mutation
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await authFetch(`/api/v1/system/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to delete user");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setUserToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.email.trim() || !editForm.role) return;
    if (editForm.role !== "platform_admin" && !editForm.tenant_id) {
      setEditStatus({
        type: "error",
        message: "Please select an organization for this user role.",
      });
      return;
    }
    setEditStatus(null);
    updateMutation.mutate(editForm);
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUserForEdit(user);
    setEditForm({
      email: user.email,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      tenant_id: user.tenant_id || "",
      role: user.role || "org:member",
      status: user.status || "active",
      password: "",
    });
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.clerk_user_id || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesTenant = tenantFilter === "all" || user.tenant_id === tenantFilter;
    return matchesSearch && matchesRole && matchesTenant;
  });

  const [copied, setCopied] = useState(false);
  const handleCopyCreds = () => {
    if (!newlyCreatedCreds) return;
    const text = `Email: ${newlyCreatedCreds.email}\nPassword: ${newlyCreatedCreds.tempPass}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Identity & Users Control</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">
            Manage local credential-based accounts, workspace assignments, and security roles.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reload</span>
          </button>
          <button
            onClick={() => {
              setNewlyCreatedCreds(null);
              setInviteStatus(null);
              setShowInviteModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
          >
            <Plus className="h-4 w-4" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/40 border border-slate-850 p-3.5 rounded-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search email, name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-200 font-semibold"
          />
        </div>
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-200 font-semibold"
          >
            <option value="all">All Security Roles</option>
            <option value="platform_admin">Platform Admin</option>
            <option value="org:admin">Organization Admin</option>
            <option value="org:member">Organization Member</option>
          </select>
        </div>
        <div>
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-200 font-semibold"
          >
            <option value="all">All Organizations</option>
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
              No users found. Click <strong>Create User</strong> to add a new account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-250 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">User ID</th>
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

                      {/* User ID */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {user.id}
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
                      <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all border border-slate-200 dark:border-slate-750"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setUserToDelete(user);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 rounded-lg text-[11px] font-bold transition-all border border-red-500/20"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
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

      {/* Invite/Create Modal */}
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
                  <span className="font-bold text-sm">Create New Platform User</span>
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

              {newlyCreatedCreds ? (
                <div className="space-y-4 text-xs bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-250 dark:border-emerald-900/30 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold mb-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>User Account Created Successfully!</span>
                  </div>
                  <p className="text-slate-650 dark:text-slate-400">
                    A local credential account has been initialized. Please share these credentials securely with the user.
                  </p>
                  <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px] relative">
                    <div><span className="text-slate-400">Email:</span> <span className="font-bold text-slate-850 dark:text-slate-200">{newlyCreatedCreds.email}</span></div>
                    <div><span className="text-slate-400">Password:</span> <span className="font-bold text-slate-850 dark:text-slate-200">{newlyCreatedCreds.tempPass}</span></div>
                    <button
                      onClick={handleCopyCreds}
                      className="absolute right-2 top-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-800 text-slate-500"
                      title="Copy credentials"
                    >
                      {copied ? <span className="text-[10px] text-emerald-500 font-bold">Copied!</span> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setNewlyCreatedCreds(null);
                        setShowInviteModal(false);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">
                      Email Address
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
                      {inviteMutation.isPending ? "Creating…" : "Create User"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {selectedUserForEdit && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!updateMutation.isPending) setSelectedUserForEdit(null);
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
                  <Edit2 className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-sm">Edit User Account</span>
                </div>
                <button
                  onClick={() => setSelectedUserForEdit(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {editStatus && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 text-xs leading-normal ${
                    editStatus.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-850 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-50 border-red-200 text-red-850 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400"
                  }`}
                >
                  {editStatus.type === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-650" />
                  )}
                  <span>{editStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">First Name</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Last Name</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Security Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    >
                      <option value="org:member">Organization Member</option>
                      <option value="org:admin">Organization Admin</option>
                      <option value="platform_admin">Platform Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {editForm.role !== "platform_admin" && (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Target Workspace / Organization</label>
                    <select
                      value={editForm.tenant_id}
                      onChange={(e) => setEditForm({ ...editForm, tenant_id: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    >
                      <option value="">— Unassigned (No Organization) —</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">
                    Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="New password"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={() => setSelectedUserForEdit(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                  >
                    {updateMutation.isPending ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeleting) setUserToDelete(null);
              }}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl z-50 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-650 dark:text-red-400">
                <Trash2 className="h-6 w-6 shrink-0" />
                <span className="font-bold text-sm">Delete User Account?</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete the user account for{" "}
                <strong>{userToDelete.email}</strong>? This action cannot be undone. 
                They will lose all access to the system.
              </p>

              {deleteError && (
                <div className="p-3 rounded-xl border bg-red-50 border-red-200 text-red-850 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 flex items-start gap-2 text-xs leading-normal">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-500/10 text-xs"
                >
                  {isDeleting ? "Deleting…" : "Delete Account"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
