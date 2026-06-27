"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Search,
  Plus,
  ShieldCheck,
  Ban,
  Trash2,
  UserCog,
  Check,
  X,
  Sliders,
  Play,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useERPStore } from "@/lib/store";
import { useApi } from "@/lib/api";

interface Organization {
  id: string;
  name: string;
  clerk_org_id: string;
  status: string;
  created_at: string;
  access_config?: {
    suppliers: boolean;
    products: boolean;
    inventory: boolean;
    purchase_orders: boolean;
    finance: boolean;
  };
}

export default function OrganizationsView() {
  const queryClient = useQueryClient();
  const { registerTenant, updateTenantAccess } = useERPStore();
  const { authFetch } = useApi();

  const [searchQuery, setSearchQuery] = useState("");
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionName, setProvisionName] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModules, setAccessModules] = useState({
    suppliers: true,
    products: true,
    inventory: true,
    purchase_orders: true,
    finance: true,
  });

  const [impersonatingOrg, setImpersonatingOrg] = useState<string | null>(null);

  // Fetch live tenants
  const { data: tenants = [], isLoading, error } = useQuery<Organization[]>({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/tenants");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      return res.json();
    },
  });

  // Mutate tenant module access config
  const updateAccessMutation = useMutation({
    mutationFn: async ({ tenantId, accessConfig }: { tenantId: string; accessConfig: typeof accessModules }) => {
      const res = await authFetch(`/api/v1/system/tenants/${tenantId}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accessConfig),
      });
      if (!res.ok) throw new Error("Failed to update access control");
      return res.json();
    },
    onSuccess: (updatedTenant) => {
      queryClient.setQueryData(["admin-tenants"], (old: any) =>
        old ? old.map((t: any) => (t.id === updatedTenant.id ? updatedTenant : t)) : []
      );
      // Sync with local Zustand store
      Object.entries(accessModules).forEach(([mod, val]) => {
        if (selectedOrg) {
          updateTenantAccess(selectedOrg.name, mod as any, val);
        }
      });
      setShowAccessModal(false);
      alert("Organization module access updated successfully.");
    },
    onError: (err) => {
      alert("Error saving: " + err.message);
    }
  });

  // Provisioning new tenant
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionName.trim()) return;

    setProvisioning(true);
    try {
      // Trigger local zustand action as sync
      registerTenant(provisionName.trim());

      // Simulate API call to build tenant
      const mockNewOrg: Organization = {
        id: `org-${Date.now()}`,
        name: provisionName.trim(),
        clerk_org_id: `org_${Math.random().toString(36).substr(2, 14)}`,
        status: "active",
        created_at: new Date().toISOString(),
        access_config: { suppliers: true, products: true, inventory: true, purchase_orders: true, finance: true }
      };

      // Add to React Query Cache
      queryClient.setQueryData(["admin-tenants"], (old: any) => [...(old || []), mockNewOrg]);
      
      setProvisionName("");
      setShowProvisionModal(false);
      alert(`Organization "${mockNewOrg.name}" provisioned successfully!`);
    } catch (err) {
      alert("Failed to provision organization");
    } finally {
      setProvisioning(false);
    }
  };

  const handleOpenAccessModal = (org: Organization) => {
    setSelectedOrg(org);
    setAccessModules({
      suppliers: org.access_config?.suppliers ?? true,
      products: org.access_config?.products ?? true,
      inventory: org.access_config?.inventory ?? true,
      purchase_orders: org.access_config?.purchase_orders ?? true,
      finance: org.access_config?.finance ?? true,
    });
    setShowAccessModal(true);
  };

  const toggleModule = (mod: keyof typeof accessModules) => {
    setAccessModules(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  const handleSaveAccess = () => {
    if (!selectedOrg) return;
    updateAccessMutation.mutate({
      tenantId: selectedOrg.id,
      accessConfig: accessModules,
    });
  };

  // Impersonation simulator
  const handleImpersonate = (orgName: string) => {
    setImpersonatingOrg(orgName);
    setTimeout(() => {
      setImpersonatingOrg(null);
      alert(`Impersonation mode activated. You are now browsing as Owner of "${orgName}".`);
    }, 2000);
  };

  // Suspend toggle simulator
  const handleToggleSuspend = (orgId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    queryClient.setQueryData(["admin-tenants"], (old: any) =>
      old ? old.map((t: any) => (t.id === orgId ? { ...t, status: nextStatus } : t)) : []
    );
    alert(`Organization status modified to: ${nextStatus.toUpperCase()}`);
  };

  const filteredTenants = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Impersonation Spinner Overlay */}
      <AnimatePresence>
        {impersonatingOrg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-white"
          >
            <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-sm font-bold tracking-wider"
            >
              ESTABLISHING IMPERSONATION SESSION
            </motion.h3>
            <p className="text-xs text-slate-450 mt-1">Connecting to {impersonatingOrg} workspace...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Organization Administration</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450">
            Manage multi-tenant workspaces, edit system module permissions, and audit billing states.
          </p>
        </div>
        <button
          onClick={() => setShowProvisionModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
        >
          <Plus className="h-4 w-4" />
          <span>Provision Tenant</span>
        </button>
      </div>

      {/* Control panel & search */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenant name or Clerk ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Organization Table */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-450 animate-pulse">Loading organizations database...</div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-450">No organizations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-250 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                  <th className="px-6 py-4">Workspace / Organization</th>
                  <th className="px-6 py-4">Clerk Reference</th>
                  <th className="px-6 py-4">Enabled Modules</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredTenants.map((tenant) => {
                  const isActive = tenant.status === "active";
                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-all duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/5 flex items-center justify-center shrink-0 border border-blue-500/20">
                            <Building2 className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <span className="font-bold block">{tenant.name}</span>
                            <span className="text-[10px] text-slate-400">ID: {tenant.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400 select-all">
                        {tenant.clerk_org_id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(tenant.access_config || {}).map(([mod, val]) => (
                            <span
                              key={mod}
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold capitalize ${
                                val
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450"
                                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                              }`}
                            >
                              {mod.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450"
                            : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-405"
                        }`}>
                          {tenant.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(tenant.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAccessModal(tenant)}
                            title="Edit Permissions"
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Sliders className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleImpersonate(tenant.name)}
                            title="Impersonate"
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleSuspend(tenant.id, tenant.status)}
                            title={isActive ? "Suspend organization" : "Re-activate organization"}
                            className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 transition-colors ${
                              isActive ? "hover:text-amber-500" : "hover:text-emerald-500"
                            }`}
                          >
                            {isActive ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Organization Modal */}
      <AnimatePresence>
        {showProvisionModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProvisionModal(false)}
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
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-sm">Provision Corporate Tenant</span>
                </div>
                <button onClick={() => setShowProvisionModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleProvisionSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Organization / Company Name</label>
                  <input
                    type="text"
                    required
                    value={provisionName}
                    onChange={(e) => setProvisionName(e.target.value)}
                    placeholder="e.g. Nexus Logistical Networks"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl leading-relaxed text-blue-750 dark:text-blue-400 text-[10px]">
                  <strong>System Notice:</strong> Manual provisioning overrides standard sign-up flow. The tenant is instantly created with all module rights enabled and marked as Active.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provisioning}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/10"
                  >
                    {provisioning ? "Provisioning..." : "Activate Tenant"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Module Access / Permissions Slideover Modal */}
      <AnimatePresence>
        {showAccessModal && selectedOrg && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccessModal(false)}
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
                  <Sliders className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-sm">Module Permissions</span>
                </div>
                <button onClick={() => setShowAccessModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">{selectedOrg.name}</h3>
                  <p className="text-[10px] text-slate-450 mt-0.5">Toggle ERP feature modules accessible to this workspace.</p>
                </div>

                <div className="space-y-2">
                  {Object.entries(accessModules).map(([mod, val]) => (
                    <div
                      key={mod}
                      onClick={() => toggleModule(mod as any)}
                      className="flex items-center justify-between p-3 border border-slate-150 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-all select-none"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold capitalize text-slate-800 dark:text-slate-200">{mod.replace("_", " ")}</span>
                        <p className="text-[9px] text-slate-400">
                          {mod === "suppliers" && "Supplier details, ratings, notes, contact files."}
                          {mod === "products" && "SKU databases, categorization, pricing limits."}
                          {mod === "inventory" && "Stock quantities, reorder points, warehouses."}
                          {mod === "purchase_orders" && "PO approvals, draft creation, supplier billing."}
                          {mod === "finance" && "GST/SGST calculations, invoicing history, payments."}
                        </p>
                      </div>
                      <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
                        val ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 dark:border-slate-800"
                      }`}>
                        {val && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => setShowAccessModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAccess}
                    disabled={updateAccessMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/10"
                  >
                    {updateAccessMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
