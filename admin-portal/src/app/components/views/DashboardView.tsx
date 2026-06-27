"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  Heart
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { formatSmartNumber } from "@/lib/utils";
import { useApi } from "@/lib/api";

interface DashboardViewProps {
  setView: (view: string) => void;
}

export default function DashboardView({ setView }: DashboardViewProps) {
  const [timeRange, setTimeRange] = useState("30d");
  const { authFetch } = useApi();

  // Fetch live analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch live history analytics
  const { data: historyData = [] } = useQuery({
    queryKey: ["platform-analytics-history"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/analytics/history");
      if (!res.ok) throw new Error("Failed to fetch history analytics");
      const data = await res.json();
      return data.history || [];
    }
  });

  // Fetch live logs feed
  const { data: auditLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["platform-audit-logs-recent"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/audit-logs?limit=5");
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Map history to chart structure
  const revenueChartData = historyData.length > 0 ? historyData.map((d: any) => ({
    month: d.month,
    revenue: d.revenue,
    users: d.organizations
  })) : [
    { month: "No Data", revenue: 0, users: 0 }
  ];

  const stats = [
    {
      label: "Total Organizations",
      value: analytics?.total_organizations ?? 0,
      change: "+0.0%",
      trend: "up",
      icon: Building2,
      color: "blue",
    },
    {
      label: "Active Platform Users",
      value: analytics?.total_active_users ?? 0,
      change: "+0.0%",
      trend: "up",
      icon: Users,
      color: "cyan",
    },
    {
      label: "Platform Revenue",
      value: analytics?.total_revenue ? `₹${formatSmartNumber(analytics.total_revenue)}` : "₹0",
      change: "+0.0%",
      trend: "up",
      icon: CreditCard,
      color: "emerald",
    },
    {
      label: "API Request Rate",
      value: "0 req/m",
      change: "0.0%",
      trend: "up",
      icon: Activity,
      color: "indigo",
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-350">
            Platform Control Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-450">
            Real-time management, usage metrics, and multi-tenant performance analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Showing:
          </span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const isUp = stat.trend === "up";
          const colorMap: any = {
            blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
            emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
          };

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl flex flex-col justify-between shadow-sm relative group hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className={`p-2 rounded-xl shrink-0 ${colorMap[stat.color]}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="space-y-1">
                {isLoading ? (
                  <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                ) : (
                  <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
                )}
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className={`font-bold flex items-center ${isUp ? "text-emerald-500" : "text-amber-500"}`}>
                    {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {stat.change}
                  </span>
                  <span className="text-slate-400">vs last month</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Financial Growth</h3>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Revenue & Organization Registrations</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                Revenue (INR)
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                Organizations
              </span>
            </div>
          </div>
          
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                <XAxis dataKey="month" className="text-slate-400" />
                <YAxis className="text-slate-400" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "11px"
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="users" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live System Logs Feed */}
        <div className="p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Security Events</h3>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Real-Time Threat logs</h2>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {isLoadingLogs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                  No security events or audit logs recorded yet.
                </div>
              ) : (
                auditLogs.map((log: any) => {
                  const date = new Date(log.created_at);
                  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
                  
                  const isAlert = log.action.includes("DELETE") || log.action.includes("FAIL") || log.action.includes("WARN") || log.action.includes("ERROR");
                  const LogIcon = isAlert ? AlertCircle : CheckCircle2;
                  const iconColor = isAlert ? "text-amber-500 animate-pulse" : "text-emerald-500";
                  
                  return (
                    <div key={log.id} className="flex items-start gap-2.5 text-[11px] leading-normal border-b border-slate-100 dark:border-slate-800/40 pb-2.5 last:border-0 last:pb-0">
                      <LogIcon className={`h-4 w-4 ${iconColor} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-slate-400 truncate">
                          {log.target_table} ID: {log.target_id || "N/A"}
                        </p>
                        <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                          {dateStr} at {timeStr}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => setView("audit")}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 transition-all mt-4"
          >
            <span>View Full Audit Logs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Operational Actions Section */}
      <div className="p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl space-y-4 shadow-sm">
        <div>
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Quick Operations</h3>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Administrative Tasks & Setup Wizard</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setView("organizations")}
            className="p-4 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-blue-950/20 border border-slate-200 dark:border-slate-850 rounded-xl text-left transition-all duration-200 group flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">Provision Tenant</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Create a new workspace organization manually.</p>
            </div>
            <Plus className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
          </button>

          <button
            onClick={() => setView("users")}
            className="p-4 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-blue-950/20 border border-slate-200 dark:border-slate-850 rounded-xl text-left transition-all duration-200 group flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">Invite Admin User</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Add an administrator to this Platform Portal.</p>
            </div>
            <Plus className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
          </button>

          <button
            onClick={() => setView("pricing")}
            className="p-4 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-blue-950/20 border border-slate-200 dark:border-slate-850 rounded-xl text-left transition-all duration-200 group flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">Configure Plans</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Edit billing tiers and subscription features.</p>
            </div>
            <Plus className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
          </button>

          <button
            onClick={() => setView("flags")}
            className="p-4 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-blue-950/20 border border-slate-200 dark:border-slate-850 rounded-xl text-left transition-all duration-200 group flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">Manage Toggles</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Enable/disable experimental platform feature sets.</p>
            </div>
            <Plus className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
          </button>
        </div>
      </div>

    </div>
  );
}
