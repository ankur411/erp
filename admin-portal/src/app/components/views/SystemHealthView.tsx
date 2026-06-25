"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Database,
  Layers,
  Mail,
  HardDrive,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Radio
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis
} from "recharts";

interface ServiceCheck {
  name: string;
  type: "db" | "redis" | "pusher" | "email" | "r2" | "jobs";
  status: "healthy" | "degraded" | "offline";
  latency: string;
  uptime: string;
  details: string;
  icon: React.ComponentType<any>;
}

export default function SystemHealthView() {
  const [refreshing, setRefreshing] = useState(false);
  const [telemetry, setTelemetry] = useState({
    cpu: 28,
    ram: 64,
    latency: 18,
    activeConnections: 142
  });

  // Simulated latency history for line graph
  const [latencyHistory, setLatencyHistory] = useState([
    { time: "12:00", ms: 15 },
    { time: "12:05", ms: 19 },
    { time: "12:10", ms: 14 },
    { time: "12:15", ms: 22 },
    { time: "12:20", ms: 16 },
    { time: "12:25", ms: 17 },
    { time: "12:30", ms: 21 },
    { time: "12:35", ms: 15 },
  ]);

  // Telemetry fluctuation simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) => {
        const nextCpu = Math.max(10, Math.min(95, prev.cpu + (Math.random() * 6 - 3)));
        const nextRam = Math.max(40, Math.min(90, prev.ram + (Math.random() * 2 - 1)));
        const nextLatency = Math.max(10, Math.min(100, Math.round(prev.latency + (Math.random() * 8 - 4))));
        const nextConn = Math.max(50, Math.min(500, prev.activeConnections + Math.round(Math.random() * 6 - 3)));

        // Update latency history
        setLatencyHistory((hist) => {
          const nextHist = [...hist.slice(1), { time: new Date().toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }), ms: nextLatency }];
          return nextHist;
        });

        return {
          cpu: Math.round(nextCpu),
          ram: Math.round(nextRam),
          latency: nextLatency,
          activeConnections: nextConn
        };
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      alert("Telemetry buffers successfully flushed. Connection pools verified.");
    }, 1000);
  };

  const services: ServiceCheck[] = [
    {
      name: "TiDB Database",
      type: "db",
      status: "healthy",
      latency: "4ms",
      uptime: "99.98%",
      details: "Connection pool: 14/100 active. Zero locked transactions.",
      icon: Database
    },
    {
      name: "Redis Cache Cache",
      type: "redis",
      status: "healthy",
      latency: "1ms",
      uptime: "100%",
      details: "Memory: 14.8MB/256MB keys: 42,912. Evictions: 0.",
      icon: Layers
    },
    {
      name: "Pusher Subscriptions",
      type: "pusher",
      status: "healthy",
      latency: "14ms",
      uptime: "99.99%",
      details: "Active client connections: 218. Channels open: 12.",
      icon: Radio
    },
    {
      name: "Resend SMTP Server",
      type: "email",
      status: "healthy",
      latency: "145ms",
      uptime: "99.95%",
      details: "Queue delay: 0.2s. Monthly quota used: 12.8%.",
      icon: Mail
    },
    {
      name: "Cloudflare R2 Bucket",
      type: "r2",
      status: "healthy",
      latency: "32ms",
      uptime: "99.99%",
      details: "Document count: 12,482. Total storage size: 84.1GB.",
      icon: HardDrive
    },
    {
      name: "Celery Workers",
      type: "jobs",
      status: "degraded",
      latency: "1.2s",
      uptime: "99.90%",
      details: "2 nodes active. 12 background jobs in queue, latency elevated.",
      icon: Clock
    }
  ];

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">System Telemetry & Health</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450">
            Real-time server workloads, connection latency, database diagnostics, and service connectivity monitoring.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 text-slate-450 ${refreshing ? "animate-spin" : ""}`} />
          <span>Sync Statuses</span>
        </button>
      </div>

      {/* Resources Workloads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CPU */}
        <div className="p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl space-y-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider">CPU WORKLOAD</span>
            <Cpu className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black">{telemetry.cpu}%</span>
              <span className="text-[10px] text-slate-400 font-semibold">capacity</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                style={{ width: `${telemetry.cpu}%` }}
              />
            </div>
          </div>
        </div>

        {/* RAM */}
        <div className="p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl space-y-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider">RAM UTILIZATION</span>
            <Layers className="h-4.5 w-4.5 text-cyan-500" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black">{telemetry.ram}%</span>
              <span className="text-[10px] text-slate-400 font-semibold">10.2GB / 16.0GB</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-1000"
                style={{ width: `${telemetry.ram}%` }}
              />
            </div>
          </div>
        </div>

        {/* Connections */}
        <div className="p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl space-y-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider">ACTIVE CONNECTIONS</span>
            <Activity className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black">{telemetry.activeConnections}</span>
              <span className="text-[10px] text-slate-400 font-semibold">sockets</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>TCP socket pools normal</span>
            </div>
          </div>
        </div>

        {/* Global Latency Card */}
        <div className="p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl space-y-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider">API LATENCY</span>
            <span className="text-[10px] text-emerald-500 font-bold">Normal</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black">{telemetry.latency}ms</span>
              <span className="text-[10px] text-slate-400 font-semibold">avg roundtrip</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Region: ap-south-1 (Mumbai)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Services status list & chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Service grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Database & Network Nodes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((srv) => {
              const Icon = srv.icon;
              const isHealthy = srv.status === "healthy";
              const isDegraded = srv.status === "degraded";

              return (
                <div
                  key={srv.name}
                  className="p-4 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-305 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-400 shrink-0">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs block">{srv.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">Ping: {srv.latency}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                      isHealthy
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : isDegraded
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        isHealthy ? "bg-emerald-500" : isDegraded ? "bg-amber-500" : "bg-red-500"
                      } shrink-0`} />
                      {srv.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-550 dark:text-slate-400 leading-normal">{srv.details}</p>

                  <div className="border-t border-slate-100 dark:border-slate-850 pt-2 flex items-center justify-between text-[9px] text-slate-400">
                    <span>Uptime SLA: <strong>{srv.uptime}</strong></span>
                    <span>Direct connection</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latency History Chart */}
        <div className="p-5 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Live Diagnostics</h3>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Gateway Response Curves</h2>
            </div>
            <p className="text-[10px] text-slate-450 leading-relaxed">
              Line graph showing WebSocket connection handshake and REST API callback response intervals in real time.
            </p>
          </div>

          <div className="h-44 w-full text-xs mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis className="text-slate-400" />
                <Area type="monotone" dataKey="ms" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-850 pt-3 text-center">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Connection Node: IN-MUM-1</span>
          </div>
        </div>

      </div>

    </div>
  );
}
