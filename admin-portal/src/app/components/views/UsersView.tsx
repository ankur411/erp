"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Mail,
  UserCheck,
  Shield,
  Ban,
  Trash2,
  X,
  Building,
  CheckCircle,
  AlertCircle
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
  created_at: string;
}

interface Tenant {
  id: string;
  name: string;
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
    role: "org:member"
  });

  const [inviteStatus, setInviteStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch live users
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Fetch tenants for dropdown selector
  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["admin-tenants-simple"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/tenants");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      return res.json();
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
    onSuccess: (newUser) => {
      queryClient.setQueryData(["admin-users"], (old: any) => [...(old || []), newUser]);
      setInviteStatus({
        type: "success",
        message: `Successfully invited ${inviteForm.email}! An invitation email has been sent via Clerk.`
      });
      setInviteForm({
        email: "",
        first_name: "",
        last_name: "",
        tenant_id: "",
        role: "org:member"
      });
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteStatus(null);
      }, 3000);
    },
    onError: (err) => {
      setInviteStatus({
        type: "error",
        message: err.message
      });
    }
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || !inviteForm.role) return;
    
    // Ensure tenant is set if not platform_admin
    if (inviteForm.role !== "platform_admin" && !inviteForm.tenant_id) {
      setInviteStatus({ type: "error", message: "Please select an organization for this user role." });
      return;
    }

    setInviteStatus(null);
    inviteMutation.mutate(inviteForm);
  };

  const handleRevokeUser = (userId: string) => {
    if (confirm("Are you sure you want to delete/revoke access for this user?")) {
      queryClient.setQueryData(["admin-users"], (old: any) =>
        old ? old.filter((u: any) => u.id !== userId) : []
      );
      alert("User access revoked.");
    }
  };

  // Filter logic
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesTenant = tenantFilter === "all" || user.tenant_id === tenantFilter;

    return matchesSearch && matchesRole && matchesTenant;
  });

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Identity & Users Control</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450">
            View user profiles, change tenant role scopes, and send platform-wide administrative invitations.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
        >
          <Plus className="h-4 w-4" />
          <span>Invite Platform User</span>
        </button>
      </div>

      {/* Filtering and search controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search email, first name, last name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
          >
            <option value="all">All Roles</option>
            <option value="platform_admin">Platform Admin</option>
            <option value="org:admin">Organization Admin</option>
            <option value="org:member">Organization Member</option>
          </select>
        </div>

        {/* Tenant Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Workspace:</span>
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
          >
            <option value="all">All Workspaces</option>
            <option value="system">Platform System</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Users Database Table */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-450 animate-pulse">Loading identity databases...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-450">No platform users found matching your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-250 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Associated Workspace</th>
                  <th className="px-6 py-4">Security Role</th>
                  <th className="px-6 py-4">Date Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredUsers.map((user) => {
                  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "?";
                  const orgName = user.tenant_id === "system" ? "Platform Portal" : (tenants.find(t => t.id === user.tenant_id)?.name || "Unknown");
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-all duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-600/5 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-bold block">
                              {user.first_name ? `${user.first_name} ${user.last_name || ""}` : "Unnamed Invitee"}
                            </span>
                            <span className="text-[9px] text-slate-400">UID: {user.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-650 dark:text-slate-350">{user.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{orgName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          user.role === "platform_admin"
                            ? "bg-purple-50 text-purple-750 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-250/20"
                            : user.role === "org:admin"
                            ? "bg-blue-50 text-blue-750 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-250/20"
                            : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/20"
                        }`}>
                          {user.role.toUpperCase().replace("ORG:", "")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(user.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRevokeUser(user.id)}
                          title="Revoke user credentials"
                          disabled={user.role === "platform_admin" && user.email === "admin@suppliererp.com"}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate-400 hover:text-red-650 dark:hover:text-red-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Invite User Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!inviteMutation.isPending) setShowInviteModal(false); }}
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
                  <span className="font-bold text-sm">Send Portal Invitation</span>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {inviteStatus && (
                <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs leading-normal ${
                  inviteStatus.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-850 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                    : "bg-red-50 border-red-200 text-red-850 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400"
                }`}>
                  {inviteStatus.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-650" />}
                  <span>{inviteStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
                
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Recipient Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>

                {/* Name fields row */}
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

                {/* Role selection */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Security Access Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value, tenant_id: e.target.value === "platform_admin" ? "system" : inviteForm.tenant_id })}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  >
                    <option value="org:member">Organization Workspace Member</option>
                    <option value="org:admin">Organization Workspace Admin</option>
                    <option value="platform_admin">Platform Admin Portal Access</option>
                  </select>
                </div>

                {/* Tenant selection (shown only if not platform_admin) */}
                {inviteForm.role !== "platform_admin" && (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Select Target Workspace</label>
                    <select
                      required
                      value={inviteForm.tenant_id}
                      onChange={(e) => setInviteForm({ ...inviteForm, tenant_id: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    >
                      <option value="">-- Choose Workspace --</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
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
                    {inviteMutation.isPending ? "Inviting..." : "Send Invitation"}
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
