"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Sliders,
  DollarSign,
  Briefcase,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  popular: boolean;
  cta: string;
  trial_days: number;
  limits?: {
    max_users?: number;
    max_suppliers?: number;
    max_purchase_orders?: number;
    max_warehouses?: number;
  };
  created_at: string;
}

export default function PricingPlansView() {
  const queryClient = useQueryClient();
  const { authFetch } = useApi();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  
  const [formState, setFormState] = useState({
    name: "",
    price: "₹4,999",
    period: "/month",
    description: "",
    features: "",
    popular: false,
    cta: "Start Free Trial",
    trial_days: 14,
    limits: {
      max_users: 10,
      max_suppliers: 50,
      max_purchase_orders: 100,
      max_warehouses: 2,
    }
  });

  const [formStatus, setFormStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch plans
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
  });

  // Mutate plan (Create / Edit)
  const savePlanMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isEdit = !!editingPlan;
      const url = isEdit
        ? `/api/v1/system/plans/${editingPlan.id}`
        : `/api/v1/system/plans`;
      
      const method = isEdit ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save pricing plan");
      }
      return res.json();
    },
    onSuccess: (savedPlan) => {
      queryClient.setQueryData(["admin-plans"], (old: any) => {
        if (!old) return [savedPlan];
        const exists = old.some((p: any) => p.id === savedPlan.id);
        if (exists) {
          return old.map((p: any) => (p.id === savedPlan.id ? savedPlan : p));
        }
        return [...old, savedPlan];
      });

      setFormStatus({
        type: "success",
        message: `Plan "${formState.name}" saved successfully!`
      });

      setTimeout(() => {
        setShowEditModal(false);
        setFormStatus(null);
        setEditingPlan(null);
      }, 1500);
    },
    onError: (err) => {
      setFormStatus({
        type: "error",
        message: err.message
      });
    }
  });

  // Mutate plan deletion
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await authFetch(`/api/v1/system/plans/${planId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete pricing tier");
      return planId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(["admin-plans"], (old: any) =>
        old ? old.filter((p: any) => p.id !== deletedId) : []
      );
      alert("Pricing plan tier removed.");
    },
    onError: (err) => {
      alert("Error: " + err.message);
    }
  });

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setFormState({
      name: "",
      price: "₹4,999",
      period: "/month",
      description: "",
      features: "Feature 1\nFeature 2",
      popular: false,
      cta: "Start Free Trial",
      trial_days: 14,
      limits: { max_users: 10, max_suppliers: 50, max_purchase_orders: 100, max_warehouses: 2 }
    });
    setShowEditModal(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormState({
      name: plan.name,
      price: plan.price,
      period: plan.period || "",
      description: plan.description,
      features: plan.features.join("\n"),
      popular: plan.popular,
      cta: plan.cta,
      trial_days: plan.trial_days,
      limits: {
        max_users: plan.limits?.max_users ?? 10,
        max_suppliers: plan.limits?.max_suppliers ?? 50,
        max_purchase_orders: plan.limits?.max_purchase_orders ?? 100,
        max_warehouses: plan.limits?.max_warehouses ?? 2,
      }
    });
    setShowEditModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);

    const payload = {
      name: formState.name,
      price: formState.price,
      period: formState.period,
      description: formState.description,
      features: formState.features.split("\n").filter(f => f.trim() !== ""),
      popular: formState.popular,
      cta: formState.cta,
      trial_days: Number(formState.trial_days),
      limits: formState.limits,
    };

    savePlanMutation.mutate(payload);
  };

  const handleDelete = (planId: string) => {
    if (confirm("Are you sure you want to delete this pricing tier? This may affect active billing cycles.")) {
      deletePlanMutation.mutate(planId);
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">SaaS Subscription Plans</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450">
            Define pricing tiers, enforce limits, and sync feature flags directly with tenant database clusters.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
        >
          <Plus className="h-4 w-4" />
          <span>Add Pricing Tier</span>
        </button>
      </div>

      {/* Plan Card Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-450 animate-pulse">Loading billing details...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            return (
              <motion.div
                key={plan.id}
                layout
                className={`p-6 rounded-2xl border flex flex-col justify-between shadow-sm relative transition-all duration-300 bg-white dark:bg-slate-900/60 backdrop-blur-sm ${
                  plan.popular
                    ? "border-blue-600 ring-1 ring-blue-600/20"
                    : "border-slate-200 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-800"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  {/* Card Title Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm">{plan.name}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">{plan.description}</p>
                    </div>
                    
                    {/* Admin Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(plan)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 hover:text-blue-600 rounded transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <span className="text-2xl font-black">{plan.price}</span>
                    <span className="text-slate-400 text-[10px] font-semibold ml-1">{plan.period}</span>
                  </div>

                  <div className="h-[1px] bg-slate-150 dark:bg-slate-850" />

                  {/* Resource Limits List */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Workspace Limits</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-between border border-slate-100 dark:border-slate-850">
                        <span className="text-slate-400">Users</span>
                        <span>{plan.limits?.max_users === 99999 || plan.limits?.max_users === 999999 ? "∞" : plan.limits?.max_users}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-between border border-slate-100 dark:border-slate-850">
                        <span className="text-slate-400">Suppliers</span>
                        <span>{plan.limits?.max_suppliers === 9999 || plan.limits?.max_suppliers === 99999 ? "∞" : plan.limits?.max_suppliers}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-between border border-slate-100 dark:border-slate-850">
                        <span className="text-slate-400">POs/m</span>
                        <span>{plan.limits?.max_purchase_orders === 99999 ? "∞" : plan.limits?.max_purchase_orders}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-between border border-slate-100 dark:border-slate-850">
                        <span className="text-slate-400">Locations</span>
                        <span>{plan.limits?.max_warehouses}</span>
                      </div>
                    </div>
                  </div>

                  {/* Feature Lists */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Features Included</span>
                    <ul className="space-y-1.5 text-[10px]">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="text-slate-650 dark:text-slate-350">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6">
                  <button className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                  }`}>
                    {plan.cta}
                  </button>
                  <div className="text-center mt-2">
                    <span className="text-[9px] text-slate-400">{plan.trial_days > 0 ? `${plan.trial_days}-Day Trial Period` : "Instant Access"}</span>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Plan Modal Form */}
      <AnimatePresence>
        {showEditModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!savePlanMutation.isPending) setShowEditModal(false); }}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-10 bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl z-50 overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-sm">{editingPlan ? `Modify Tier: ${editingPlan.name}` : "Build New Billing Plan"}</span>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {formStatus && (
                <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs leading-normal ${
                  formStatus.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-850 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-450"
                    : "bg-red-50 border-red-200 text-red-850 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400"
                }`}>
                  {formStatus.type === "success" ? <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-650" />}
                  <span>{formStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="e.g. Starter Enterprise"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>

                {/* Price and Period row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Plan Cost (string format)</label>
                    <input
                      type="text"
                      required
                      value={formState.price}
                      onChange={(e) => setFormState({ ...formState, price: e.target.value })}
                      placeholder="e.g. ₹4,999"
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Billing Cycle Interval</label>
                    <input
                      type="text"
                      value={formState.period}
                      onChange={(e) => setFormState({ ...formState, period: e.target.value })}
                      placeholder="e.g. /month, /year or blank"
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Marketing Description</label>
                  <input
                    type="text"
                    required
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    placeholder="Short summary of target audience."
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>

                {/* CTA, Trial and Popular Flag Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">CTA Label</label>
                    <input
                      type="text"
                      required
                      value={formState.cta}
                      onChange={(e) => setFormState({ ...formState, cta: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Trial Days</label>
                    <input
                      type="number"
                      required
                      value={formState.trial_days}
                      onChange={(e) => setFormState({ ...formState, trial_days: Number(e.target.value) })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div
                      onClick={() => setFormState({ ...formState, popular: !formState.popular })}
                      className="flex items-center gap-2.5 cursor-pointer select-none p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 h-10"
                    >
                      <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 ${
                        formState.popular ? "bg-blue-600 border-blue-600 text-white" : "border-slate-350"
                      }`}>
                        {formState.popular && <Check className="h-3 w-3" />}
                      </div>
                      <span className="font-bold">Highlight Card</span>
                    </div>
                  </div>
                </div>

                {/* Resource limits */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-855 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] text-slate-400 tracking-wider">
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Database Enforced Limits</span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Max Users</span>
                      <input
                        type="number"
                        required
                        value={formState.limits.max_users}
                        onChange={(e) => setFormState({ ...formState, limits: { ...formState.limits, max_users: Number(e.target.value) } })}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded p-1.5 bg-white dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Max Suppliers</span>
                      <input
                        type="number"
                        required
                        value={formState.limits.max_suppliers}
                        onChange={(e) => setFormState({ ...formState, limits: { ...formState.limits, max_suppliers: Number(e.target.value) } })}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded p-1.5 bg-white dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Max POs/m</span>
                      <input
                        type="number"
                        required
                        value={formState.limits.max_purchase_orders}
                        onChange={(e) => setFormState({ ...formState, limits: { ...formState.limits, max_purchase_orders: Number(e.target.value) } })}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded p-1.5 bg-white dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Warehouses</span>
                      <input
                        type="number"
                        required
                        value={formState.limits.max_warehouses}
                        onChange={(e) => setFormState({ ...formState, limits: { ...formState.limits, max_warehouses: Number(e.target.value) } })}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded p-1.5 bg-white dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Features (text-area newline separated) */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Marketing Features (one per line)</label>
                  <textarea
                    required
                    rows={4}
                    value={formState.features}
                    onChange={(e) => setFormState({ ...formState, features: e.target.value })}
                    placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold font-mono text-[10px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    disabled={savePlanMutation.isPending}
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savePlanMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/10"
                  >
                    {savePlanMutation.isPending ? "Saving Tier..." : "Publish Pricing Tier"}
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
