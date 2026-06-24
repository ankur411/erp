"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  Activity,
  Database,
  Terminal as TerminalIcon,
  Settings,
  Plus,
  Users,
  ChevronLeft,
  Sun,
  Moon,
  CheckCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Server,
  Key,
  Globe,
  Trash2,
  HardDrive
} from "lucide-react";
import { useERPStore } from "@/lib/store";

export default function AdminPortalPage() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [newTenantName, setNewTenantName] = useState("");
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Store integration settings state
  const [settingsForm, setSettingsForm] = useState({
    clerkPublishableKey: "pk_test_Y2xlcmsuZXJwLnN1cHBsaWVyLmNvbSQ",
    clerkSecretKey: "sk_test_••••••••••••••••••••••••••••",
    pusherAppId: "1827364",
    pusherKey: "push_key_9283f",
    resendApiKey: "re_9s8df7283ns7dfysdgfsdf",
    r2BucketName: "supplier-erp-documents",
    redisUrl: "redis://localhost:6379/0"
  });

  // System Stats Simulation State
  const [systemStats, setSystemStats] = useState({
    cpu: 28,
    ram: 2.6,
    dbLatency: 12,
    activeRequests: 4
  });

  const {
    tenantAccess,
    updateTenantAccess,
    registerTenant,
    suppliers,
    products,
    purchaseOrders,
    invoices
  } = useERPStore();

  // Populate initial logs
  useEffect(() => {
    setLogs([
      `[${new Date().toISOString()}] Platform kernel initialized.`,
      `[${new Date().toISOString()}] DB Connection pool active (10 max connections).`,
      `[${new Date().toISOString()}] Redis connection established at redis://localhost:6379/0`,
      `[${new Date().toISOString()}] Webhook listener active on /api/v1/system/webhooks/clerk`,
      `[${new Date().toISOString()}] Tenant access list loaded (${Object.keys(tenantAccess).length} active tenants).`
    ]);
  }, []);

  // System Stat fluctuation
  useEffect(() => {
    const statInterval = setInterval(() => {
      setSystemStats(prev => ({
        cpu: Math.max(10, Math.min(95, prev.cpu + Math.floor(Math.random() * 11) - 5)),
        ram: Math.max(1.8, Math.min(7.8, Number((prev.ram + (Math.random() * 0.4 - 0.2)).toFixed(2)))),
        dbLatency: Math.max(2, Math.min(80, prev.dbLatency + Math.floor(Math.random() * 7) - 3)),
        activeRequests: Math.max(0, Math.min(50, prev.activeRequests + Math.floor(Math.random() * 5) - 2))
      }));
    }, 3000);

    return () => clearInterval(statInterval);
  }, []);

  // Log feed simulation
  useEffect(() => {
    const logInterval = setInterval(() => {
      const endpoints = [
        "GET /api/v1/suppliers",
        "GET /api/v1/inventory",
        "POST /api/v1/purchase/po",
        "PUT /api/v1/finance/invoice/payment",
        "POST /api/v1/system/sync-profile"
      ];
      const tenants = Object.keys(tenantAccess);
      const randomTenant = tenants[Math.floor(Math.random() * tenants.length)] || "System";
      const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const randomLatency = Math.floor(Math.random() * 45) + 5;
      
      const newLog = `[${new Date().toISOString()}] [Tenant: ${randomTenant}] ${randomEndpoint} - 200 OK (${randomLatency}ms)`;
      setLogs(prev => [newLog, ...prev.slice(0, 19)]);
    }, 4500);

    return () => clearInterval(logInterval);
  }, [tenantAccess]);

  const handleRegisterTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    
    registerTenant(newTenantName.trim());
    const newLog = `[${new Date().toISOString()}] [System] PROVISIONED NEW TENANT: "${newTenantName.trim()}" (access keys configured, database namespace allocated)`;
    setLogs(prev => [newLog, ...prev]);
    setNewTenantName("");
    setShowAddTenant(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = `[${new Date().toISOString()}] [System] Integration config saved. Global environment variables updated.`;
    setLogs(prev => [newLog, ...prev]);
    alert("Platform integration settings updated successfully!");
  };

  // Aggregated data metrics
  const statsMetrics = useMemo(() => {
    return {
      tenantsCount: Object.keys(tenantAccess).length,
      suppliersCount: suppliers.length,
      productsCount: products.length,
      ordersCount: purchaseOrders.length,
      invoicesCount: invoices.length
    };
  }, [tenantAccess, suppliers, products, purchaseOrders, invoices]);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${darkMode ? "dark bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-900"}`}>
      
      {/* HEADER BAR */}
      <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link 
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-550 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Workspace</span>
          </Link>
          <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-850"></div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            <h1 className="text-sm font-bold tracking-tight uppercase">Platform Admin Portal</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-450 text-[10px] font-extrabold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SYSTEM ONLINE
          </span>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* CORE CONTAINER */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* GRID 1: SYSTEM HEALTH OVERVIEW */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-zinc-455 dark:text-zinc-450">
              <span className="text-xs font-semibold uppercase tracking-wider">CPU Core Utilization</span>
              <Activity className={`h-4.5 w-4.5 ${systemStats.cpu > 80 ? "text-red-500" : "text-emerald-500"}`} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight">{systemStats.cpu}%</span>
              <span className="text-[10px] text-zinc-400">8 Cores active</span>
            </div>
            <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  systemStats.cpu > 80 ? "bg-red-500" : systemStats.cpu > 60 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${systemStats.cpu}%` }}
              ></div>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-zinc-455 dark:text-zinc-450">
              <span className="text-xs font-semibold uppercase tracking-wider">RAM Usage</span>
              <HardDrive className="h-4.5 w-4.5 text-blue-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight">{systemStats.ram} GB</span>
              <span className="text-[10px] text-zinc-400">of 8 GB allocated</span>
            </div>
            <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(systemStats.ram / 8) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-zinc-455 dark:text-zinc-450">
              <span className="text-xs font-semibold uppercase tracking-wider">MySQL / TiDB Latency</span>
              <Database className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight">{systemStats.dbLatency} ms</span>
              <span className="text-[10px] text-emerald-500">Excellent</span>
            </div>
            <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (systemStats.dbLatency / 100) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-zinc-455 dark:text-zinc-450">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Socket Connections</span>
              <Server className="h-4.5 w-4.5 text-purple-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight">{systemStats.activeRequests}</span>
              <span className="text-[10px] text-zinc-400">Pusher Channels</span>
            </div>
            <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(systemStats.activeRequests / 50) * 100}%` }}
              ></div>
            </div>
          </div>

        </section>

        {/* MIDDLE SECTION: TENANT MANAGEMENT & TERMINAL LOGS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1 & 2: TENANT ACCESS CONTROL */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                    <Users className="h-5 w-5 text-zinc-400" />
                    Multi-Tenant Subscription Registry
                  </h2>
                  <p className="text-xs text-zinc-450 mt-1">
                    Isolate databases and toggle permission states for each tenant tenant-namespace.
                  </p>
                </div>
                
                <button
                  onClick={() => setShowAddTenant(true)}
                  className="flex items-center gap-1 bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 px-3.5 py-2 rounded-xl text-xs font-semibold transition-opacity"
                >
                  <Plus className="h-4 w-4" /> Provision Tenant
                </button>
              </div>

              {/* Add Tenant Modal / Inline form */}
              {showAddTenant && (
                <form 
                  onSubmit={handleRegisterTenant}
                  className="p-4 bg-zinc-55/40 dark:bg-zinc-850/30 border border-zinc-250 dark:border-zinc-800 rounded-xl space-y-3"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider">Register New Corporate Tenant</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Organization Name (e.g. Star Industries Ltd.)"
                      required
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      className="flex-1 text-xs border rounded-lg p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                    />
                    <button 
                      type="submit"
                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                      Provision
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowAddTenant(false)}
                      className="border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-2 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Tenants Grid */}
              <div className="space-y-4">
                {Object.entries(tenantAccess).map(([company, modules]) => {
                  const companyId = company.toLowerCase().replace(/[^a-z0-9]/g, "-");
                  return (
                    <div 
                      key={company} 
                      className="border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 bg-zinc-50/30 dark:bg-zinc-900/30 space-y-4"
                    >
                      <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-3">
                        <div>
                          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{company}</h3>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Namespace ID: {companyId}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                          ACTIVE SUB
                        </span>
                      </div>

                      {/* Module Toggles */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {(["suppliers", "products", "inventory", "purchaseOrders", "finance"] as const).map((module) => {
                          const isEnabled = modules[module];
                          const label = module === "purchaseOrders" ? "Procurement" : module;
                          return (
                            <button
                              key={module}
                              type="button"
                              onClick={() => updateTenantAccess(company, module, !isEnabled)}
                              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 ${
                                isEnabled
                                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-black dark:border-zinc-100"
                                  : "bg-zinc-50/50 border-zinc-200 text-zinc-500 dark:bg-zinc-800/20 dark:border-zinc-800 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
                              }`}
                            >
                              <span className="text-[9px] uppercase font-bold tracking-wider opacity-75">{label}</span>
                              <div className="mt-2 flex items-center justify-between w-full">
                                <span className="text-[10px] font-semibold">{isEnabled ? "Enabled" : "Disabled"}</span>
                                {isEnabled ? (
                                  <ToggleRight className="h-4.5 w-4.5 text-emerald-450 dark:text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4.5 w-4.5 text-zinc-400" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

          {/* COLUMN 3: REAL-TIME AUDIT LOGS */}
          <div className="space-y-6">
            
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl shadow-lg p-5 flex flex-col h-[525px] overflow-hidden text-zinc-300 font-mono text-[11px]">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-3 shrink-0">
                <span className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-zinc-400">
                  <TerminalIcon className="h-4.5 w-4.5 text-emerald-400" />
                  Live Platform Logs
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                {logs.map((log, index) => {
                  let logColor = "text-zinc-350";
                  if (log.includes("PROVISIONED")) logColor = "text-emerald-400 font-bold";
                  if (log.includes("POST")) logColor = "text-blue-300";
                  if (log.includes("PUT")) logColor = "text-purple-300";
                  if (log.includes("config")) logColor = "text-amber-400";
                  
                  return (
                    <div key={index} className={`leading-relaxed border-b border-zinc-900 pb-1.5 break-words ${logColor}`}>
                      {log}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-850 shrink-0 text-zinc-500 text-[10px] flex justify-between">
                <span>Buffer: 20 entries</span>
                <span>Namespace: platform.admin.audit</span>
              </div>
            </div>

          </div>

        </section>

        {/* BOTTOM SECTION: INTEGRATION KEYS & CONFIG */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1 & 2: INTEGRATION CONFIGURATION */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <Settings className="h-5 w-5 text-zinc-400" />
              <div>
                <h2 className="text-base font-bold tracking-tight">Platform Integration Credentials</h2>
                <p className="text-xs text-zinc-450 mt-0.5">
                  Securely configure credentials for core API endpoints and microservice webhooks.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Clerk Publishable Key</label>
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                    <input 
                      type="text" 
                      value={settingsForm.clerkPublishableKey}
                      onChange={(e) => setSettingsForm({...settingsForm, clerkPublishableKey: e.target.value})}
                      className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Clerk Secret Key</label>
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-450" />
                    <input 
                      type="text" 
                      value={settingsForm.clerkSecretKey}
                      onChange={(e) => setSettingsForm({...settingsForm, clerkSecretKey: e.target.value})}
                      className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 font-mono text-zinc-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Pusher App ID</label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-455" />
                    <input 
                      type="text" 
                      value={settingsForm.pusherAppId}
                      onChange={(e) => setSettingsForm({...settingsForm, pusherAppId: e.target.value})}
                      className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Pusher Cluster Key</label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-455" />
                    <input 
                      type="text" 
                      value={settingsForm.pusherKey}
                      onChange={(e) => setSettingsForm({...settingsForm, pusherKey: e.target.value})}
                      className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Resend Email API Key</label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-455" />
                    <input 
                      type="text" 
                      value={settingsForm.resendApiKey}
                      onChange={(e) => setSettingsForm({...settingsForm, resendApiKey: e.target.value})}
                      className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Cloudflare R2 Bucket</label>
                  <div className="relative">
                    <HardDrive className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-455" />
                    <input 
                      type="text" 
                      value={settingsForm.r2BucketName}
                      onChange={(e) => setSettingsForm({...settingsForm, r2BucketName: e.target.value})}
                      className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Redis Database URL</label>
                  <div className="relative">
                    <Server className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-455" />
                    <input 
                      type="text" 
                      value={settingsForm.redisUrl}
                      onChange={(e) => setSettingsForm({...settingsForm, redisUrl: e.target.value})}
                      className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit"
                  className="bg-zinc-900 text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Save Global Configuration
                </button>
              </div>
            </form>
          </div>

          {/* COLUMN 3: SYSTEM SUMMARY STATISTICS CARD */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Platform Database Aggregates
            </h3>
            <p className="text-xs text-zinc-450">
              Aggregated system metrics across all database namespaces. Represents the live count of relations.
            </p>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Total Registered Tenants</span>
                <span className="font-bold">{statsMetrics.tenantsCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Total Verified Suppliers</span>
                <span className="font-bold">{statsMetrics.suppliersCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Global Product Catalog SKUs</span>
                <span className="font-bold">{statsMetrics.productsCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Active Purchase Orders</span>
                <span className="font-bold">{statsMetrics.ordersCount}</span>
              </div>
              <div className="flex justify-between py-1.5 text-emerald-555 dark:text-emerald-400 font-bold">
                <span>Outstanding Finance Invoices</span>
                <span>{statsMetrics.invoicesCount}</span>
              </div>
            </div>
          </div>

        </section>

      </main>

      <footer className="py-8 border-t border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-center text-[10px] text-zinc-400 mt-12">
        <p>© 2026 SupplierERP Inc. • Cloud Administration Module • Kernel v1.4.2-Prod</p>
      </footer>

    </div>
  );
}
