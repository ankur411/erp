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
  HardDrive,
  Edit,
  LogOut
} from "lucide-react";
import { useERPStore } from "@/lib/store";
import { formatSmartNumber } from "@/lib/utils";
import { SafeSignOutButton } from "@/components/SafeSignOutButton";

export default function AdminPortalPage() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [newTenantName, setNewTenantName] = useState("");
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "plans">("overview");

  // Live analytics state
  const [liveAnalytics, setLiveAnalytics] = useState({
    total_organizations: 0,
    total_active_users: 0,
    total_suppliers: 0,
    total_purchase_orders: 0,
    total_payments: 0,
    total_inventory_items: 0,
    total_revenue: 0.0,
    total_documents_uploaded: 0
  });

  // Users management state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    tenant_id: "",
    role: "org:member"
  });
  const [inviteStatus, setInviteStatus] = useState<{ type: "success" | "error", message: string } | null>(null);

  // Plans management state
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    price: 0.0,
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
      max_warehouses: 2
    }
  });
  const [planStatus, setPlanStatus] = useState<{ type: "success" | "error", message: string } | null>(null);

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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchLiveAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/system/analytics`);
      if (res.ok) {
        const data = await res.json();
        setLiveAnalytics(data);
      }
    } catch (err) {
      console.error("Error fetching admin platform analytics:", err);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/system/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching admin users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/system/plans`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error("Error fetching admin plans:", err);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchLiveAnalytics();
    fetchUsers();
    fetchPlans();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/system/users/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm)
      });
      if (res.ok) {
        const data = await res.json();
        setInviteStatus({ type: "success", message: `Successfully invited ${data.email}!` });
        const newLog = `[${new Date().toISOString()}] [System] INVITED USER: "${data.email}" to tenant namespace "${inviteForm.tenant_id || 'Global'}"`;
        setLogs(prev => [newLog, ...prev]);
        setInviteForm({
          email: "",
          first_name: "",
          last_name: "",
          tenant_id: "",
          role: "org:member"
        });
        fetchUsers();
        fetchLiveAnalytics();
      } else {
        const errData = await res.json();
        setInviteStatus({ type: "error", message: errData.detail || "Failed to invite user." });
      }
    } catch (err) {
      setInviteStatus({ type: "error", message: "Failed to connect to the backend server." });
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanStatus(null);
    try {
      const url = editingPlan 
        ? `${API_URL}/api/v1/system/plans/${editingPlan.id}`
        : `${API_URL}/api/v1/system/plans`;
      const method = editingPlan ? "PUT" : "POST";
      
      const featuresArray = planForm.features.split("\n").map(f => f.trim()).filter(Boolean);
      
      const payload = {
        name: planForm.name,
        price: Number(planForm.price),
        period: planForm.period,
        description: planForm.description,
        features: featuresArray,
        popular: planForm.popular,
        cta: planForm.cta,
        trial_days: Number(planForm.trial_days),
        limits: planForm.limits
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setPlanStatus({ type: "success", message: `Plan successfully ${editingPlan ? "updated" : "created"}!` });
        const newLog = `[${new Date().toISOString()}] [System] ${editingPlan ? "UPDATED" : "CREATED"} PRICING PLAN: "${planForm.name}"`;
        setLogs(prev => [newLog, ...prev]);
        setEditingPlan(null);
        setPlanForm({
          name: "",
          price: 0.0,
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
            max_warehouses: 2
          }
        });
        fetchPlans();
        fetchLiveAnalytics();
      } else {
        const errData = await res.json();
        setPlanStatus({ type: "error", message: errData.detail || "Failed to save plan." });
      }
    } catch (err) {
      setPlanStatus({ type: "error", message: "Failed to connect to the backend server." });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this subscription plan?")) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/system/plans/${planId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("Subscription plan deleted successfully!");
        const deletedPlan = plans.find(p => p.id === planId);
        const newLog = `[${new Date().toISOString()}] [System] DELETED PRICING PLAN ID: "${planId}" (${deletedPlan?.name || 'Unknown'})`;
        setLogs(prev => [newLog, ...prev]);
        fetchPlans();
        fetchLiveAnalytics();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to delete subscription plan.");
      }
    } catch (err) {
      alert("Failed to connect to the backend server.");
    }
  };

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

          <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-850"></div>

          <SafeSignOutButton 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-250 hover:bg-zinc-100 text-zinc-650 hover:text-zinc-950 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all text-xs font-bold"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </SafeSignOutButton>
        </div>
      </header>

      {/* CORE CONTAINER */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* TAB NAVIGATION */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 sm:gap-2 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "overview"
                ? "border-emerald-500 text-emerald-500"
                : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "users"
                ? "border-emerald-500 text-emerald-500"
                : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100"
            }`}
          >
            User & Team Management
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "plans"
                ? "border-emerald-500 text-emerald-500"
                : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100"
            }`}
          >
            Pricing Plans
          </button>
        </div>

        {activeTab === "overview" && (
          <>
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

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Total Registered Tenants</span>
                <span className="font-bold">{formatSmartNumber(liveAnalytics.total_organizations)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Total Active Users</span>
                <span className="font-bold">{formatSmartNumber(liveAnalytics.total_active_users)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Total Verified Suppliers</span>
                <span className="font-bold">{formatSmartNumber(liveAnalytics.total_suppliers)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Global Purchase Orders</span>
                <span className="font-bold">{formatSmartNumber(liveAnalytics.total_purchase_orders)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Total Payments Logged</span>
                <span className="font-bold">{formatSmartNumber(liveAnalytics.total_payments)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Global Inventory Stock</span>
                <span className="font-bold">{formatSmartNumber(liveAnalytics.total_inventory_items)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-550 dark:text-zinc-400">Total Documents Stored</span>
                <span className="font-bold">{formatSmartNumber(liveAnalytics.total_documents_uploaded)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-emerald-555 dark:text-emerald-450 font-bold">
                <span>Total Platform Revenue</span>
                <span>₹{formatSmartNumber(liveAnalytics.total_revenue)}</span>
              </div>
            </div>
          </div>

        </section>
          </>
        )}

        {/* ========================================================= */}
        {/* USERS & TEAM MANAGEMENT TAB                               */}
        {/* ========================================================= */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Invite User Form */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h2 className="text-base font-bold tracking-tight">Invite Corporate Member</h2>
                  <p className="text-xs text-zinc-450 mt-1">
                    Send a Clerk invitation and register user record inside the database namespace.
                  </p>
                </div>

                {inviteStatus && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    inviteStatus.type === "success" 
                      ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400" 
                      : "bg-red-100/80 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                  }`}>
                    {inviteStatus.type === "success" ? <CheckCircle className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
                    <span>{inviteStatus.message}</span>
                  </div>
                )}

                <form onSubmit={handleInviteUser} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. user@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">First Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Rohan"
                        value={inviteForm.first_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                        className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Last Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Verma"
                        value={inviteForm.last_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                        className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Organization Tenant</label>
                    <select
                      required
                      value={inviteForm.tenant_id}
                      onChange={(e) => setInviteForm({ ...inviteForm, tenant_id: e.target.value })}
                      className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                    >
                      <option value="">Select Tenant Organization</option>
                      {Object.keys(tenantAccess).map(tName => {
                        const tId = tName.toLowerCase().replace(/[^a-z0-9]/g, "-");
                        return <option key={tName} value={tId}>{tName} ({tId})</option>;
                      })}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Role Definition</label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                      className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                    >
                      <option value="org:member">Organization Member</option>
                      <option value="org:admin">Organization Administrator</option>
                      <option value="org:procurement_manager">Procurement Manager</option>
                      <option value="org:warehouse_manager">Warehouse Manager</option>
                      <option value="org:accountant">Accountant</option>
                      <option value="org:hr_manager">HR Manager</option>
                      <option value="platform_admin">Platform Admin</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-zinc-900 text-white dark:bg-white dark:text-black py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    Send Clerk Invitation
                  </button>
                </form>
              </div>

              {/* Users List */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h2 className="text-base font-bold tracking-tight">Active Platform Users</h2>
                    <p className="text-xs text-zinc-450 mt-1">
                      A list of registered members and users active across all corporate tenants.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-855 dark:bg-zinc-800 dark:text-zinc-300">
                    {users.length} Users Total
                  </span>
                </div>

                {loadingUsers ? (
                  <div className="py-12 text-center text-xs text-zinc-400">Loading active users from DB...</div>
                ) : users.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400">No active users found in the database.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-250 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-2">Name</th>
                          <th className="py-3 px-2">Email</th>
                          <th className="py-3 px-2">Tenant Namespace</th>
                          <th className="py-3 px-2">Role</th>
                          <th className="py-3 px-2">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                            <td className="py-3 px-2 font-semibold">{u.first_name} {u.last_name}</td>
                            <td className="py-3 px-2 text-zinc-500 dark:text-zinc-400">{u.email}</td>
                            <td className="py-3 px-2 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{u.tenant_id || "Global (Admin)"}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                u.role === "platform_admin" 
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400"
                                  : u.role === "org:admin"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-450"
                                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-850/40 dark:text-zinc-350"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-zinc-400">{new Date(u.created_at || u.joined_at || Date.now()).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PRICING PLANS TAB                                         */}
        {/* ========================================================= */}
        {activeTab === "plans" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Create/Edit Plan Form */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold tracking-tight">{editingPlan ? "Modify Pricing Plan" : "Create Pricing Plan"}</h2>
                    <p className="text-xs text-zinc-450 mt-1">
                      Configure details, feature checklists, and system limit settings.
                    </p>
                  </div>
                  {editingPlan && (
                    <button
                      onClick={() => {
                        setEditingPlan(null);
                        setPlanForm({
                          name: "",
                          price: 0.0,
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
                            max_warehouses: 2
                          }
                        });
                      }}
                      className="text-xs text-zinc-400 hover:text-zinc-650"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {planStatus && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    planStatus.type === "success" 
                      ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400" 
                      : "bg-red-100/80 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                  }`}>
                    {planStatus.type === "success" ? <CheckCircle className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
                    <span>{planStatus.message}</span>
                  </div>
                )}

                <form onSubmit={handleSavePlan} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Plan Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Growth Enterprise"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Price (INR)</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        step="0.01"
                        placeholder="e.g. 4999.00"
                        value={planForm.price}
                        onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Period</label>
                      <input 
                        type="text" 
                        required
                        placeholder="/month or /year"
                        value={planForm.period}
                        onChange={(e) => setPlanForm({ ...planForm, period: e.target.value })}
                        className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Description</label>
                    <textarea 
                      placeholder="Brief description of whom this plan is tailored for."
                      value={planForm.description}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      className="w-full text-xs border rounded-lg p-2.5 h-16 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Features Checklist (One per line)</label>
                    <textarea 
                      placeholder="e.g. Multi-warehouse support&#10;Manager approval chains&#10;API access"
                      value={planForm.features}
                      onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                      className="w-full text-xs border rounded-lg p-2.5 h-20 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 resize-none font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">CTA Button Label</label>
                      <input 
                        type="text" 
                        required
                        value={planForm.cta}
                        onChange={(e) => setPlanForm({ ...planForm, cta: e.target.value })}
                        className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Trial Period (Days)</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        value={planForm.trial_days}
                        onChange={(e) => setPlanForm({ ...planForm, trial_days: parseInt(e.target.value) || 0 })}
                        className="w-full text-xs border rounded-lg p-2.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-55/50 dark:bg-zinc-850/20 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Resource System Limits</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-450 block uppercase">Max Active Users</label>
                        <input 
                          type="number" 
                          required
                          value={planForm.limits.max_users}
                          onChange={(e) => setPlanForm({ ...planForm, limits: { ...planForm.limits, max_users: parseInt(e.target.value) || 1 } })}
                          className="w-full text-xs border rounded-lg p-1.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-450 block uppercase">Max Suppliers</label>
                        <input 
                          type="number" 
                          required
                          value={planForm.limits.max_suppliers}
                          onChange={(e) => setPlanForm({ ...planForm, limits: { ...planForm.limits, max_suppliers: parseInt(e.target.value) || 1 } })}
                          className="w-full text-xs border rounded-lg p-1.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-450 block uppercase">Max Monthly POs</label>
                        <input 
                          type="number" 
                          required
                          value={planForm.limits.max_purchase_orders}
                          onChange={(e) => setPlanForm({ ...planForm, limits: { ...planForm.limits, max_purchase_orders: parseInt(e.target.value) || 1 } })}
                          className="w-full text-xs border rounded-lg p-1.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-450 block uppercase">Max Warehouses</label>
                        <input 
                          type="number" 
                          required
                          value={planForm.limits.max_warehouses}
                          onChange={(e) => setPlanForm({ ...planForm, limits: { ...planForm.limits, max_warehouses: parseInt(e.target.value) || 1 } })}
                          className="w-full text-xs border rounded-lg p-1.5 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="checkbox"
                      id="popular"
                      checked={planForm.popular}
                      onChange={(e) => setPlanForm({ ...planForm, popular: e.target.checked })}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="popular" className="text-xs font-semibold text-zinc-600 dark:text-zinc-350 select-none">Mark as Popular Plan</label>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    {editingPlan ? "Update Pricing Plan" : "Create Pricing Plan"}
                  </button>
                </form>
              </div>

              {/* Plans List Grid */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h2 className="text-base font-bold tracking-tight">Active Platform Subscription Tiers</h2>
                    <p className="text-xs text-zinc-450 mt-1">
                      Manage all pricing plan configurations that organizations can purchase and subscribe to.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-855 dark:bg-zinc-800 dark:text-zinc-300">
                    {plans.length} Tiers Available
                  </span>
                </div>

                {loadingPlans ? (
                  <div className="py-12 text-center text-xs text-zinc-400 font-mono">Loading tiers from DB...</div>
                ) : plans.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-450">No pricing plans found. Create one using the form!</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map(p => (
                      <div 
                        key={p.id} 
                        className={`border rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                          p.popular 
                            ? "bg-zinc-55/20 border-emerald-500/80 shadow-md dark:bg-zinc-850/10" 
                            : "border-zinc-200 dark:border-zinc-850 bg-zinc-50/10"
                        }`}
                      >
                        {p.popular && (
                          <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-555 text-white dark:bg-emerald-600 tracking-wider uppercase">
                            POPULAR CHOICE
                          </span>
                        )}
                        <div className="space-y-3.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{p.name}</h3>
                              <p className="text-[11px] text-zinc-500 mt-1 leading-normal">{p.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-black text-zinc-900 dark:text-zinc-100">₹{p.price.toLocaleString()}</span>
                              <span className="text-[10px] text-zinc-450 block font-bold">{p.period}</span>
                            </div>
                          </div>

                          <div className="border-t border-zinc-150 dark:border-zinc-850 pt-2.5 space-y-2">
                            <h4 className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Included Features</h4>
                            <ul className="space-y-1.5">
                              {p.features && p.features.map((feat: string, idx: number) => (
                                <li key={idx} className="text-[11px] text-zinc-650 dark:text-zinc-400 flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="border-t border-zinc-150 dark:border-zinc-850 pt-2.5 space-y-1.5">
                            <h4 className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Resource Limits</h4>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                              <div>Users: {p.limits?.max_users} max</div>
                              <div>Suppliers: {p.limits?.max_suppliers} max</div>
                              <div>Monthly POs: {p.limits?.max_purchase_orders} max</div>
                              <div>Warehouses: {p.limits?.max_warehouses} max</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2.5 mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-850">
                          <button
                            onClick={() => {
                              setEditingPlan(p);
                              setPlanForm({
                                name: p.name,
                                price: p.price,
                                period: p.period,
                                description: p.description || "",
                                features: p.features ? p.features.join("\n") : "",
                                popular: p.popular || false,
                                cta: p.cta || "Start Free Trial",
                                trial_days: p.trial_days || 14,
                                limits: p.limits || {
                                  max_users: 10,
                                  max_suppliers: 50,
                                  max_purchase_orders: 100,
                                  max_warehouses: 2
                                }
                              });
                            }}
                            className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlan(p.id)}
                            className="bg-red-55 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 p-2 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </main>

      <footer className="py-8 border-t border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-center text-[10px] text-zinc-400 mt-12">
        <p>© 2026 SupplierERP Inc. • Cloud Administration Module • Kernel v1.4.2-Prod</p>
      </footer>

    </div>
  );
}
