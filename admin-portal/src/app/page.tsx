"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useERPStore } from "@/lib/store";
import AdminLayout from "./components/AdminLayout";
import AdminAuthGuard from "./components/AdminAuthGuard";

// Import core modular sub-views
import DashboardView from "./components/views/DashboardView";
import OrganizationsView from "./components/views/OrganizationsView";
import UsersView from "./components/views/UsersView";
import PricingPlansView from "./components/views/PricingPlansView";
import SystemHealthView from "./components/views/SystemHealthView";
import AuditLogsView from "./components/views/AuditLogsView";
import FeatureFlagsView from "./components/views/FeatureFlagsView";
import SettingsView from "./components/views/SettingsView";
import SupportTicketsView from "./components/views/SupportTicketsView";

// Lucide icon placeholders
import { HelpCircle, Sparkles, Server, HardDrive, Shield, AlertTriangle } from "lucide-react";

function AdminPortalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentView, setView] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(true);

  // Sync state to URL view param on mount/updates
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam) {
      setView(viewParam);
    }
  }, [searchParams]);

  const handleSetView = (view: string) => {
    setView(view);
    const params = new URLSearchParams(window.location.search);
    params.set("view", view);
    router.push(`?${params.toString()}`);
  };

  // Toggle body theme class for CSS custom variables
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Render view dispatcher
  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView setView={handleSetView} />;
      case "organizations":
        return <OrganizationsView />;
      case "users":
        return <UsersView />;
      case "pricing":
      case "subscriptions":
        return <PricingPlansView />;
      case "health":
        return <SystemHealthView />;
      case "audit":
      case "activity":
        return <AuditLogsView />;
      case "flags":
        return <FeatureFlagsView />;
      case "settings":
        return <SettingsView />;
      case "support":
        return <SupportTicketsView />;

      // Fallbacks for less common management views in next sprint
      case "analytics":
        return (
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4">
            <Sparkles className="h-10 w-10 text-blue-600 mx-auto animate-pulse" />
            <h2 className="text-sm font-bold">Deep Platform Analytics</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Real-time purchase order volumes, supplier growth vectors, and financial ledger graphs are integrated directly inside the main Dashboard tab.
            </p>
            <button onClick={() => handleSetView("dashboard")} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
              Go to Dashboard
            </button>
          </div>
        );
      
      case "storage":
        return (
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4">
            <HardDrive className="h-10 w-10 text-cyan-500 mx-auto" />
            <h2 className="text-sm font-bold">Cloudflare R2 Bucket Browser</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Inspect invoice PDF attachments, tax records, and documents directly in Cloudflare Object Storage.
            </p>
            <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] rounded-full font-bold text-slate-500">
              Read-only system connection active
            </span>
          </div>
        );

      default:
        return (
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4">
            <Server className="h-10 w-10 text-slate-400 mx-auto" />
            <h2 className="text-sm font-bold">Portal Section Under Development</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              The requested administrative panel is scheduled for integration in the next staging pipeline rollout.
            </p>
            <button onClick={() => handleSetView("dashboard")} className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 rounded-xl text-xs font-bold">
              Return to Control Center
            </button>
          </div>
        );
    }
  };

  return (
    <AdminLayout
      currentView={currentView}
      setView={handleSetView}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    >
      {renderContent()}
    </AdminLayout>
  );
}

export default function AdminPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing Admin Session...</p>
        </div>
      </div>
    }>
      <AdminAuthGuard>
        <AdminPortalPageContent />
      </AdminAuthGuard>
    </Suspense>
  );
}
