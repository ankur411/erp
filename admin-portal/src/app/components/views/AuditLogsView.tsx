"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ScrollText,
  Search,
  SlidersHorizontal,
  User,
  Key,
  ShieldAlert,
  Building,
  RefreshCcw,
  Clock,
  Eye,
  ArrowDownToLine
} from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  ip: string;
  category: "auth" | "workspace" | "pricing" | "security" | "system";
  details: string;
}

const INITIAL_LOGS: AuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-06-25T17:15:22+05:30",
    action: "Workspace Module Toggle",
    user: "admin@suppliererp.com",
    ip: "122.161.49.201",
    category: "workspace",
    details: "Toggled 'Finance' module to ENABLED for tenant 'Nexus Logistics Ltd.'"
  },
  {
    id: "log-2",
    timestamp: "2026-06-25T16:42:10+05:30",
    action: "Pricing Plan Published",
    user: "admin@suppliererp.com",
    ip: "122.161.49.201",
    category: "pricing",
    details: "Modified limits and published updates to 'Starter Plan' tier."
  },
  {
    id: "log-3",
    timestamp: "2026-06-25T15:30:45+05:30",
    action: "Security Key Revocation",
    user: "admin@suppliererp.com",
    ip: "122.161.49.201",
    category: "security",
    details: "Revoked legacy Stripe webhook subscription endpoint API Key."
  },
  {
    id: "log-4",
    timestamp: "2026-06-25T14:12:03+05:30",
    action: "User Invitation Dispatched",
    user: "admin@suppliererp.com",
    ip: "122.161.49.201",
    category: "auth",
    details: "Sent organization invite to 'priya.sharma@acme.com' under Acme Manufacturing."
  },
  {
    id: "log-5",
    timestamp: "2026-06-25T11:00:15+05:30",
    action: "Celery Backup Initiated",
    user: "system_cron",
    ip: "127.0.0.1",
    category: "system",
    details: "Automated snapshot backup generated and uploaded to Cloudflare R2 bucket."
  },
  {
    id: "log-6",
    timestamp: "2026-06-25T09:24:55+05:30",
    action: "Suspicious Activity Blocked",
    user: "security_guard",
    ip: "185.220.101.44",
    category: "security",
    details: "Rate limited SSH attempt on backend cluster. IP blacklisted for 24h."
  }
];

export default function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>(INITIAL_LOGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ipFilter, setIpFilter] = useState("");

  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(logs, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `platform_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    const matchesIp = !ipFilter || log.ip.includes(ipFilter);

    return matchesSearch && matchesCategory && matchesIp;
  });

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "auth":
        return { icon: User, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" };
      case "workspace":
        return { icon: Building, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" };
      case "pricing":
        return { icon: Key, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
      case "security":
        return { icon: ShieldAlert, color: "text-red-500 bg-red-500/10 border-red-500/20" };
      default:
        return { icon: ScrollText, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" };
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">System Audit Trail</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450">
            Immutable log of all user operations, pricing updates, security events, and cron schedules.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <ArrowDownToLine className="h-4 w-4 text-slate-450" />
          <span>Export Logs JSON</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action details, user email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Category select */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider">Type:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
          >
            <option value="all">All Events</option>
            <option value="auth">Auth & Invites</option>
            <option value="workspace">Workspaces</option>
            <option value="pricing">Pricing & Billing</option>
            <option value="security">Threats & Keys</option>
            <option value="system">Cron & Workers</option>
          </select>
        </div>

        {/* IP filter */}
        <div className="relative">
          <input
            type="text"
            placeholder="Filter by IP..."
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            className="w-36 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all placeholder-slate-400"
          />
        </div>

      </div>

      {/* Timeline container */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm relative">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-450">No matching audit logs found.</div>
        ) : (
          <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-8 space-y-8 py-2">
            {filteredLogs.map((log, i) => {
              const { icon: Icon, color } = getCategoryStyles(log.category);
              const formattedDate = new Date(log.timestamp).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "medium",
              });

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative group"
                >
                  {/* Icon Bullet */}
                  <div className={`absolute -left-[45px] top-0 h-8 w-8 rounded-full border flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {/* Log action title */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Log Details */}
                    <p className="text-slate-550 dark:text-slate-350 leading-relaxed font-semibold">{log.details}</p>

                    {/* Metadata footer */}
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        Actor: <strong>{log.user}</strong>
                      </span>
                      <span>IP Address: <strong className="font-mono">{log.ip}</strong></span>
                      <button className="text-blue-600 hover:underline flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>Inspect Payload</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
