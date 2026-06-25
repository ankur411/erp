"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ToggleRight,
  Plus,
  Sliders,
  Sparkles,
  Info,
  CheckCircle,
  XCircle,
  ChevronDown
} from "lucide-react";

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: "all" | "beta" | "internal";
  env: "production" | "staging" | "all";
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: "feat_ai_po_generation",
    name: "AI Purchase Order Drafting",
    description: "Uses generative LLM to automatically parse supplier quotes and draft PO templates.",
    enabled: true,
    scope: "beta",
    env: "all"
  },
  {
    key: "feat_multi_warehouse_routing",
    name: "Multi-Warehouse Smart Routing",
    description: "Enables smart splitting of inventory receipts across multiple regional depots.",
    enabled: false,
    scope: "all",
    env: "staging"
  },
  {
    key: "feat_realtime_pusher_telemetry",
    name: "Real-Time Pusher Telemetry",
    description: "Channels active server load and log updates to the Platform Admin Dashboard.",
    enabled: true,
    scope: "internal",
    env: "all"
  },
  {
    key: "feat_sms_billing_notifications",
    name: "Twilio SMS Invoice Dispatch",
    description: "Dispatches SMS alerts to suppliers when invoices are generated or payment recorded.",
    enabled: false,
    scope: "all",
    env: "production"
  }
];

export default function FeatureFlagsView() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [showAddFlag, setShowAddFlag] = useState(false);
  
  const [newFlag, setNewFlag] = useState({
    key: "",
    name: "",
    description: "",
    scope: "beta" as FeatureFlag["scope"],
    env: "all" as FeatureFlag["env"]
  });

  // Load flags from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("platform_feature_flags");
    if (saved) {
      try {
        setFlags(JSON.parse(saved));
      } catch (e) {
        setFlags(DEFAULT_FLAGS);
      }
    } else {
      setFlags(DEFAULT_FLAGS);
      localStorage.setItem("platform_feature_flags", JSON.stringify(DEFAULT_FLAGS));
    }
  }, []);

  const handleToggle = (key: string) => {
    const nextFlags = flags.map((f) =>
      f.key === key ? { ...f, enabled: !f.enabled } : f
    );
    setFlags(nextFlags);
    localStorage.setItem("platform_feature_flags", JSON.stringify(nextFlags));
  };

  const handleCreateFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlag.key.trim() || !newFlag.name.trim()) return;

    // Check key duplicate
    if (flags.some(f => f.key === newFlag.key.trim())) {
      alert("Feature flag key already exists.");
      return;
    }

    const created: FeatureFlag = {
      key: newFlag.key.trim(),
      name: newFlag.name.trim(),
      description: newFlag.description.trim(),
      enabled: false,
      scope: newFlag.scope,
      env: newFlag.env
    };

    const nextFlags = [...flags, created];
    setFlags(nextFlags);
    localStorage.setItem("platform_feature_flags", JSON.stringify(nextFlags));

    setNewFlag({ key: "", name: "", description: "", scope: "beta", env: "all" });
    setShowAddFlag(false);
    alert(`Feature flag "${created.name}" created.`);
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Feature Rollouts & Flags</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450">
            Control application module toggles dynamically, run A/B beta testing groups, and manage staging gating.
          </p>
        </div>
        <button
          onClick={() => setShowAddFlag(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
        >
          <Plus className="h-4 w-4" />
          <span>Add Feature Flag</span>
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flags.map((flag) => {
          return (
            <div
              key={flag.key}
              className="p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{flag.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        flag.scope === "all"
                          ? "bg-blue-55 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                          : flag.scope === "beta"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          : "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400"
                      }`}>
                        {flag.scope}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono select-all">{flag.key}</span>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    onClick={() => handleToggle(flag.key)}
                    className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-250 flex items-center ${
                      flag.enabled ? "bg-blue-650" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <motion.div
                      layout
                      className="h-4 w-4 rounded-full bg-white shadow-sm"
                      animate={{ x: flag.enabled ? 16 : 0 }}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{flag.description}</p>
              </div>

              {/* Status and scopes */}
              <div className="border-t border-slate-100 dark:border-slate-850 pt-3 mt-4 flex items-center justify-between text-[9px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${flag.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"} shrink-0`} />
                  State: <strong>{flag.enabled ? "ON" : "OFF"}</strong>
                </span>
                <span>Scope: <strong>{flag.env.toUpperCase()} Environments</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Flag Modal Dialog */}
      AnimatePresence
      {showAddFlag && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowAddFlag(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl z-50 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <span className="font-bold text-sm">Add Feature Gating Flag</span>
              <button onClick={() => setShowAddFlag(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                Close
              </button>
            </div>

            <form onSubmit={handleCreateFlag} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-405">Feature Key (snake_case)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. feat_ai_invoice_parse"
                  value={newFlag.key}
                  onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                  className="w-full border border-slate-250 dark:border-slate-800 rounded-lg p-2 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-405">Display Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Invoice Parser"
                  value={newFlag.name}
                  onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                  className="w-full border border-slate-250 dark:border-slate-800 rounded-lg p-2 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-405">Feature description</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of target use."
                  value={newFlag.description}
                  onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                  className="w-full border border-slate-250 dark:border-slate-800 rounded-lg p-2 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-405">Scope Group</label>
                  <select
                    value={newFlag.scope}
                    onChange={(e) => setNewFlag({ ...newFlag, scope: e.target.value as any })}
                    className="w-full border border-slate-250 dark:border-slate-800 rounded-lg p-2 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="beta">Beta Users</option>
                    <option value="all">General Rollout (All)</option>
                    <option value="internal">Platform Admins Only</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-405">Target Env</label>
                  <select
                    value={newFlag.env}
                    onChange={(e) => setNewFlag({ ...newFlag, env: e.target.value as any })}
                    className="w-full border border-slate-250 dark:border-slate-800 rounded-lg p-2 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="all">All Environments</option>
                    <option value="production">Production Only</option>
                    <option value="staging">Staging Only</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFlag(false)}
                  className="px-3.5 py-1.5 border border-slate-250 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Create Toggle
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}

    </div>
  );
}
