"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Tag,
  Receipt,
  TrendingUp,
  LifeBuoy,
  ScrollText,
  Key,
  Settings,
  Bell,
  HardDrive,
  Activity,
  Shield,
  ToggleRight,
  Cpu,
  RefreshCw,
  Plug,
  User,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Command,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Sparkles
} from "lucide-react";
import { SafeSignOutButton } from "@/components/SafeSignOutButton";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: string;
  category: "Core" | "Operations" | "Management" | "Security & System";
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  // Core
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, category: "Core" },
  { id: "analytics", label: "Analytics", icon: TrendingUp, category: "Core" },
  { id: "activity", label: "Activity Feed", icon: Activity, category: "Core" },

  // Operations
  { id: "organizations", label: "Organizations", icon: Building2, category: "Operations", badge: "Live" },
  { id: "users", label: "Users", icon: Users, category: "Operations" },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard, category: "Operations" },
  { id: "payments", label: "Payments", icon: Receipt, category: "Operations" },

  // Management
  { id: "pricing", label: "Pricing Plans", icon: Tag, category: "Management" },
  { id: "flags", label: "Feature Flags", icon: ToggleRight, category: "Management", badge: "Beta" },
  { id: "integrations", label: "Integrations", icon: Plug, category: "Management" },
  { id: "support", label: "Support Tickets", icon: LifeBuoy, category: "Management" },

  // Security & System
  { id: "health", label: "System Health", icon: Cpu, category: "Security & System" },
  { id: "audit", label: "Audit Logs", icon: ScrollText, category: "Security & System" },
  { id: "security", label: "Security", icon: Shield, category: "Security & System" },
  { id: "backups", label: "Backups", icon: RefreshCw, category: "Security & System" },
  { id: "settings", label: "System Settings", icon: Settings, category: "Security & System" },
];

interface AdminLayoutProps {
  currentView: string;
  setView: (view: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  children: React.ReactNode;
}

export default function AdminLayout({
  currentView,
  setView,
  darkMode,
  setDarkMode,
  children
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  // Close menus on resize or navigation
  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
    setProfileDropdownOpen(false);
  }, [currentView]);

  // Filtered sidebar items based on sidebar search query
  const filteredItems = SIDEBAR_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  // Group items by category
  const categories = ["Core", "Operations", "Management", "Security & System"] as const;

  const mockNotifications = [
    { id: 1, title: "Database Load Warning", desc: "TiDB CPU spiked above 85% for 3 mins.", time: "5m ago", type: "warning" },
    { id: 2, title: "New Enterprise Sub", desc: "Nexus Logistics upgraded to Enterprise Plan.", time: "2h ago", type: "success" },
    { id: 3, title: "Failed Login Attempt", desc: "Suspicious login blocked from IP 185.22.4.91.", time: "4h ago", type: "error" },
  ];

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* BACKGROUND GRAPHICS */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none z-0 dark:from-blue-500/2" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none z-0 dark:bg-cyan-500/2" />

      {/* MOBILE SIDEBAR PANEL (DRAWER) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 p-4 flex flex-col justify-between lg:hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                      <Shield className="h-5 w-5" />
                    </div>
                    <span className="font-bold tracking-tight text-sm uppercase">SupplierERP Admin</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Sidebar Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sections..."
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* Sidebar List */}
                <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
                  {categories.map((cat) => {
                    const catItems = filteredItems.filter((i) => i.category === cat);
                    if (catItems.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-2">
                          {cat}
                        </span>
                        {catItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = currentView === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setView(item.id);
                                setMobileOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                isActive
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "text-slate-650 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-450"
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Logout */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <SafeSignOutButton className="w-full flex items-center gap-2 justify-center px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-bold rounded-xl transition-all">
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>Log Out Portal</span>
                </SafeSignOutButton>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR PANEL */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? "72px" : "260px" }}
        className="hidden lg:flex flex-col justify-between border-r border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/90 backdrop-blur-sm sticky top-0 h-screen z-30 shrink-0 select-none overflow-hidden"
      >
        <div className="p-4 flex-1 flex flex-col min-h-0">
          {/* Logo Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 shadow-md shadow-blue-500/20">
                <Shield className="h-5 w-5" />
              </div>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-bold tracking-tight text-xs uppercase bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400"
                >
                  SupplierERP Suite
                </motion.span>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Sidebar Search */}
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Quick navigate..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full text-[11px] border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all placeholder-slate-400 dark:placeholder-slate-500"
              />
            </motion.div>
          )}

          {/* Sidebar Items */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-850">
            {categories.map((cat) => {
              const catItems = filteredItems.filter((i) => i.category === cat);
              if (catItems.length === 0) return null;
              return (
                <div key={cat} className="space-y-1">
                  {!sidebarCollapsed && (
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-2.5 mb-1.5">
                      {cat}
                    </span>
                  )}
                  {catItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          {!sidebarCollapsed && <span>{item.label}</span>}
                        </div>
                        {!sidebarCollapsed && item.badge && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                            isActive ? "bg-white/20 text-white" : "bg-blue-55 text-blue-750 dark:bg-blue-950/40 dark:text-blue-400"
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        {sidebarCollapsed && isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-l-md" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop Collapse Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2 overflow-hidden shrink-0">
          <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
              <h4 className="text-[11px] font-bold truncate">System Admin</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">admin@suppliererp.com</p>
            </motion.div>
          )}
        </div>
      </motion.aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        
        {/* STICKY HEADER */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-850 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          
          {/* Header left */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Global Search Input */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources, organizations, logs..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className="w-72 text-xs border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:w-80 transition-all placeholder-slate-400 dark:placeholder-slate-500"
              />
              <div className="absolute right-2.5 top-2 px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[8px] font-black text-slate-400 select-none">
                ⌘K
              </div>

              {/* Global search auto-suggest list */}
              <AnimatePresence>
                {searchFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-11 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden p-2 space-y-1.5 text-xs max-h-80 overflow-y-auto"
                  >
                    <div className="px-2 py-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">Suggested Actions</div>
                    <button onClick={() => setView("organizations")} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      <span>Search Organizations</span>
                    </button>
                    <button onClick={() => setView("users")} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-cyan-500" />
                      <span>Invite Platform User</span>
                    </button>
                    <button onClick={() => setView("pricing")} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Edit Subscription Pricing</span>
                    </button>
                    <button onClick={() => setView("health")} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-purple-500" />
                      <span>Check System Health</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Header right */}
          <div className="flex items-center gap-3">
            {/* Version Tag */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50/50 text-[10px] font-black text-blue-600 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400">
              <Sparkles className="h-3 w-3 animate-pulse text-blue-500" />
              v1.4.2-PROD
            </span>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
            >
              {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-700" />}
            </button>

            {/* Quick Actions popover */}
            <div className="relative">
              <button
                onClick={() => setView("settings")}
                className="hidden sm:block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10"
              >
                Quick Settings
              </button>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileDropdownOpen(false);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 relative transition-colors"
              >
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-xl z-20 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wider">Alert Center</span>
                        <button className="text-[10px] text-blue-600 hover:underline">Mark all read</button>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-80 overflow-y-auto">
                        {mockNotifications.map((notif) => (
                          <div key={notif.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850/40 text-xs transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-bold ${
                                notif.type === "error" ? "text-red-500" : notif.type === "warning" ? "text-amber-500" : "text-emerald-500"
                              }`}>{notif.title}</span>
                              <span className="text-[9px] text-slate-400">{notif.time}</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">{notif.desc}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
                        <button onClick={() => { setView("activity"); setNotificationsOpen(false); }} className="text-[10px] font-bold text-blue-600 hover:underline">View All Platform Logs</button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setNotificationsOpen(false);
                }}
                className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-blue-500/20 transition-all select-none"
              >
                SA
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-xl z-20 overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <p className="text-xs font-bold">System Admin</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">admin@suppliererp.com</p>
                      </div>
                      <div className="p-1.5 space-y-0.5 text-xs">
                        <button
                          onClick={() => { setView("profile"); setProfileDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                        >
                          <User className="h-4 w-4 text-slate-400" />
                          <span>My Profile</span>
                        </button>
                        <button
                          onClick={() => { setView("settings"); setProfileDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                        >
                          <Settings className="h-4 w-4 text-slate-400" />
                          <span>Settings</span>
                        </button>
                        <a
                          href="https://docs.suppliererp.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 text-slate-700 dark:text-slate-350"
                        >
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          <span className="flex-1">Documentation</span>
                          <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                        </a>
                        <button
                          onClick={() => { setView("health"); setProfileDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                        >
                          <Cpu className="h-4 w-4 text-slate-400" />
                          <span>Status Page</span>
                        </button>
                      </div>
                      <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20">
                        <SafeSignOutButton className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-semibold rounded-lg transition-all">
                          <LogOut className="h-4 w-4" />
                          <span>Log Out</span>
                        </SafeSignOutButton>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT PORT */}
        <main className="flex-1 p-6 overflow-y-auto relative z-10 max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

    </div>
  );
}
