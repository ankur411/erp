"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatSmartNumber } from "@/lib/utils";
import {
  Users,
  Package,
  Warehouse,
  CreditCard,
  FileText,
  UserCheck,
  BarChart3,
  TrendingUp,
  Building,
  ShieldAlert,
  Bell,
  Sparkles,
  ArrowRight,
  Check,
  ChevronDown,
  Play,
  Calendar,
  Layers,
  Lock,
  Zap,
  Bot,
  Star,
  Globe,
  Terminal,
  Menu,
  X
} from "lucide-react";

// Mock trusted companies list
const TRUSTED_COMPANIES = [
  { name: "Supreme Materials", logo: "SM", desc: "Supreme Materials Ltd" },
  { name: "Global Packaging", logo: "GP", desc: "Global Packaging Corp" },
  { name: "Apex Logistics", logo: "AL", desc: "Apex Logistics & Co" },
  { name: "Nexus Distributors", logo: "ND", desc: "Nexus Distributors" },
  { name: "Vanguard Steel", logo: "VS", desc: "Vanguard Steel Group" }
];

// Interactive Dashboard Tabs
type PreviewTab = "overview" | "suppliers" | "inventory" | "purchases";

export default function LandingPage() {
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>("overview");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);



  const [liveStats, setLiveStats] = useState({
    total_organizations: 0,
    total_active_users: 0,
    total_suppliers: 0,
    total_purchase_orders: 0,
    total_payments: 0,
    total_inventory_items: 0,
    total_revenue: 0.0,
    total_documents_uploaded: 0
  });

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/system/analytics`);
        if (res.ok) {
          const data = await res.json();
          setLiveStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch live platform analytics:", err);
      }
    };
    fetchLiveStats();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const features = [
    {
      title: "Supplier Management",
      icon: Users,
      color: "from-blue-500 to-indigo-500",
      description: "Onboard, track ratings, manage GST/PAN details, and store contracts for all suppliers in one workspace."
    },
    {
      title: "Purchase Orders",
      icon: FileText,
      color: "from-indigo-500 to-violet-500",
      description: "Automate PO drafting, implement multi-level manager approval loops, and track fulfillment in real time."
    },
    {
      title: "Inventory Control",
      icon: Package,
      color: "from-violet-500 to-purple-500",
      description: "Set reorder thresholds, receive automatic warnings for low stock levels, and coordinate physical inventory."
    },
    {
      title: "Warehouse Management",
      icon: Warehouse,
      color: "from-pink-500 to-rose-500",
      description: "Manage multiple warehouses, track location coordinates, and run physical stock counts with digital audit trails."
    },
    {
      title: "Payment Tracking",
      icon: CreditCard,
      color: "from-emerald-500 to-teal-500",
      description: "Create purchase invoices, record bank payments, and monitor outstanding accounts payable effortlessly."
    },
    {
      title: "Attendance Tracker",
      icon: UserCheck,
      color: "from-green-500 to-emerald-500",
      description: "Monitor team shifts, check-ins, and task assignments with strict multi-tenant data boundaries."
    },
    {
      title: "Analytical Reports",
      icon: BarChart3,
      color: "from-cyan-500 to-blue-500",
      description: "Generate spend analytics, category analysis tables, and warehouse efficiency indexes instantly."
    },
    {
      title: "Double-Entry Ledger",
      icon: TrendingUp,
      color: "from-sky-500 to-cyan-500",
      description: "Auto-record every stock IN/OUT adjustment with secondary double-entry transaction trails."
    },
    {
      title: "Multi Organization",
      icon: Building,
      color: "from-amber-500 to-orange-500",
      description: "Switch seamlessly between multiple companies under a single corporate tenant subscription."
    },
    {
      title: "Role Based Access (RBAC)",
      icon: Lock,
      color: "from-red-500 to-orange-500",
      description: "Enforce strict roles: Admins, Procurement Managers, Warehouse Managers, Accountants, and Employees."
    },
    {
      title: "Real-time Notifications",
      icon: Zap,
      color: "from-yellow-500 to-amber-500",
      description: "Stay updated with real-time Pusher integrations on PO approvals, stock levels, and new invoices."
    },
    {
      title: "AI ERP Assistant",
      icon: Bot,
      color: "from-teal-500 to-cyan-500",
      description: "Ask natural language questions about low stock items, top supplier ratings, or monthly procurement spend."
    }
  ];

  const pricingTiers = [
    {
      name: "Starter",
      price: "₹4,999",
      period: "/month",
      description: "Perfect for growing suppliers looking to digitize their inventory and purchase orders.",
      features: [
        "Up to 2 Warehouses",
        "Up to 50 Suppliers",
        "Standard Purchase Orders",
        "Role-Based Access Control",
        "Email Support",
        "99.9% Uptime Guarantee"
      ],
      popular: false,
      cta: "Start 14-Day Free Trial"
    },
    {
      name: "Professional",
      price: "₹14,999",
      period: "/month",
      description: "Our most popular package. Engineered for scale, multi-warehouse operations, and deep analytics.",
      features: [
        "Unlimited Warehouses",
        "Unlimited Suppliers",
        "Advanced PO Approval Loops",
        "Interactive Analytics & Spend Trends",
        "Double-Entry Stock Ledger",
        "Real-time notifications (Pusher)",
        "AI ERP Assistant (2,500 queries/mo)",
        "Priority 24/7 Support"
      ],
      popular: true,
      cta: "Start 14-Day Free Trial"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Custom deployments, dedicated databases, and high-frequency real-time integrations.",
      features: [
        "Multiple Corporate Parent Entities",
        "Dedicated Database / Region Select",
        "Custom API & ERP Integrations",
        "Unlimited AI ERP Assistant Queries",
        "SLA 99.99% Contractual Uptime",
        "Dedicated Account Success Manager",
        "Custom Feature Flags",
        "Platform Audit Logs Export"
      ],
      popular: false,
      cta: "Contact Enterprise Sales"
    }
  ];

  const faqs = [
    {
      q: "What is SupplierERP and how does it secure multi-tenant data?",
      a: "SupplierERP is a comprehensive SaaS platform built to handle procurement, warehousing, inventory, and ledger tracking. We enforce strict data separation at the database and API middleware layer. This ensures that no organization or tenant can ever access or leak data to another tenant."
    },
    {
      q: "Can I manage multiple warehouse locations simultaneously?",
      a: "Yes. Our platform supports multiple warehouses. You can transfer inventory, adjust stock levels independently, view distributed stock ratios in real-time, and run physical counts with customized double-entry ledgers."
    },
    {
      q: "How does the Role-Based Access Control (RBAC) work?",
      a: "Each team member is assigned a specific role (e.g. Procurement Manager, Warehouse Manager, Accountant, Employee). Actions like approving purchase orders require a Procurement Manager role, while physical stock corrections require a Warehouse Manager role. Platform configurations can restrict entire tabs based on active licenses."
    },
    {
      q: "Is there a free trial, and do I need a credit card?",
      a: "We offer a 14-day fully featured free trial of our Professional plan. You do not need a credit card to sign up and start testing the workflow templates."
    },
    {
      q: "How does the AI ERP Assistant help our operations?",
      a: "The AI ERP Assistant hooks directly into your organization's ledger and catalog. You can query it in plain English, such as 'Which raw metals are below reorder thresholds?' or 'Show me the total procurement spend for Supreme Materials this month' to get immediate structured answers."
    }
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      
      {/* BACKGROUND DECORATIVE GRADIENTS */}
      <div className="absolute top-0 left-0 right-0 h-[600px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-blue-500/10 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-[10%] right-[-10%] w-[45%] aspect-square rounded-full bg-cyan-400/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* HEADER NAVBAR */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              SE
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Supplier<span className="text-blue-600">ERP</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-650 hover:text-blue-600 transition-colors">Features</a>
            <a href="#preview" className="text-sm font-medium text-slate-650 hover:text-blue-600 transition-colors">Dashboard Preview</a>
            <a href="#pricing" className="text-sm font-medium text-slate-650 hover:text-blue-600 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-slate-650 hover:text-blue-600 transition-colors">FAQ</a>
          </nav>

          {/* Navigation CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">
              Sign In
            </Link>
            <Link href="/sign-in" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-600/10 hover:shadow-blue-650/20 hover:-translate-y-0.5 transition-all">
              Start Free Trial
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-slate-650 hover:bg-slate-100 transition-colors">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-200"
            >
              <div className="px-4 py-6 flex flex-col gap-4">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 hover:text-blue-600">Features</a>
                <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 hover:text-blue-600">Dashboard Preview</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 hover:text-blue-600">Pricing</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-slate-700 hover:text-blue-600">FAQ</a>
                <hr className="border-slate-100 my-1" />
                <div className="flex flex-col gap-3">
                  <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)} className="flex justify-center py-2 text-base font-semibold text-slate-700 hover:text-blue-600">
                    Sign In
                  </Link>
                  <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)} className="flex justify-center bg-blue-600 text-white hover:bg-blue-700 py-3 rounded-xl text-base font-semibold shadow-md shadow-blue-500/10">
                    Start Free Trial
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section className="pt-8 pb-16 sm:pb-24 lg:pt-16 lg:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-5 text-center lg:text-left flex flex-col items-center lg:items-start">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold text-blue-700 mb-6"
            >
              <Sparkles className="h-3 w-3 text-cyan-500" />
              <span>Next-Gen Enterprise ERP Platform</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight"
            >
              Streamline Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">Suppliers</span> & Warehousing.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg text-slate-500 leading-relaxed max-w-md sm:max-w-xl"
            >
              Configure automated purchase orders, synchronize inventory distributions across multiple depots, and enforce strict roles. All-in-one secure multi-tenant cloud workspace.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Link href="/sign-in" className="flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-600/35 hover:-translate-y-0.5 transition-all text-base">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#preview" className="flex items-center justify-center gap-2 bg-white text-slate-800 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 px-8 py-4 rounded-xl font-bold shadow-sm transition-all text-base">
                <Play className="h-4 w-4 text-blue-600 fill-blue-600/10" /> Book a Demo
              </a>
            </motion.div>
          </div>

          {/* Right Visual (ERP Dashboard Mockup + Floating Cards) */}
          <div className="lg:col-span-7 relative mt-8 lg:mt-0 flex justify-center">
            
            {/* Background glowing blob */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] aspect-video rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-400/20 blur-3xl -z-10 pointer-events-none animate-pulse-slow"></div>

            {/* Browser Mockup */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full max-w-[620px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-850 overflow-hidden relative"
            >
              {/* Window Header */}
              <div className="h-10 bg-slate-850 border-b border-slate-800 flex items-center px-4 justify-between">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                  <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                </div>
                <div className="bg-slate-900 text-[10px] text-slate-450 font-medium px-8 py-1 rounded border border-slate-800/80">
                  erp.suppliererp.com/dashboard
                </div>
                <div className="w-10"></div>
              </div>

              {/* Mockup Dashboard Content */}
              <div className="p-4 sm:p-6 bg-slate-900 text-white select-none">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div>
                    <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">WORKSPACE</div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <Building className="h-3.5 w-3.5 text-blue-400" /> Acme Manufacturing Inc.
                    </div>
                  </div>
                  <div className="bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-850 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-450 uppercase block font-medium">Active Suppliers</span>
                    <span className="text-lg font-black mt-1 block">42</span>
                  </div>
                  <div className="bg-slate-850 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-450 uppercase block font-medium">Inventory Value</span>
                    <span className="text-lg font-black mt-1 block">₹28.4L</span>
                  </div>
                  <div className="bg-slate-850 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-450 uppercase block font-medium">Pending Orders</span>
                    <span className="text-lg font-black mt-1 block">18</span>
                  </div>
                </div>

                {/* Simulated Chart */}
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Procurement Spend Trend</span>
                    <span className="text-[10px] text-blue-400 font-bold">This Quarter</span>
                  </div>
                  <div className="h-28 flex items-end justify-between gap-2 pt-2 px-1">
                    <div className="bg-blue-600/40 hover:bg-blue-600 w-full h-[30%] rounded-t-sm transition-all duration-300"></div>
                    <div className="bg-blue-600/40 hover:bg-blue-600 w-full h-[45%] rounded-t-sm transition-all duration-300"></div>
                    <div className="bg-blue-600/40 hover:bg-blue-600 w-full h-[60%] rounded-t-sm transition-all duration-300"></div>
                    <div className="bg-blue-600/40 hover:bg-blue-600 w-full h-[50%] rounded-t-sm transition-all duration-300"></div>
                    <div className="bg-blue-600/40 hover:bg-blue-600 w-full h-[75%] rounded-t-sm transition-all duration-300"></div>
                    <div className="bg-blue-600 hover:bg-blue-500 w-full h-[95%] rounded-t-sm transition-all duration-300 relative">
                      <div className="absolute top-[-16px] left-1/2 transform -translate-x-1/2 bg-blue-600 text-[8px] font-bold px-1 rounded">₹4.9L</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating UI Cards */}
            {/* Card 1: Alert */}
            <motion.div 
              initial={{ opacity: 0, x: -30, y: 30 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="absolute left-[-20px] top-[15%] bg-white dark:bg-slate-850 p-3.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-[190px] animate-float hidden sm:block"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600">
                  <ShieldAlert className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider leading-none">ALERT</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-250 mt-1 block">Low Stock: Steel</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Threshold reached</span>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Status */}
            <motion.div 
              initial={{ opacity: 0, x: 30, y: 50 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="absolute right-[-10px] bottom-[15%] bg-white dark:bg-slate-850 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-[200px] animate-float-delayed hidden sm:block"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-semibold">PO #2026-004</span>
                  <span className="text-xs font-bold text-slate-850 dark:text-slate-200 block">Approved & Dispatched</span>
                  <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">₹4,95,600.00</span>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Metrics */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="absolute bottom-[-15px] left-[50px] bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 hover:scale-102 transition-transform"
            >
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
              <span className="text-[10px] font-bold text-slate-350 tracking-wide uppercase">Real-time Sync Active</span>
            </motion.div>
          </div>

        </div>
      </section>

      {/* TRUSTED BY SECTION */}
      <section className="bg-slate-100 border-y border-slate-200/65 py-12 select-none overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-8">
            Empowering Modern Procurement Pipelines Globally
          </p>

          {/* Slider logos */}
          <div className="flex flex-wrap justify-center items-center gap-10 sm:gap-16 lg:gap-20 opacity-70">
            {TRUSTED_COMPANIES.map((company, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  {company.logo}
                </div>
                <span className="font-semibold text-slate-700 text-sm tracking-tight">{company.name}</span>
              </div>
            ))}
          </div>

          {/* Stats Counters Grid */}
          <div className="max-w-2xl mx-auto grid grid-cols-2 gap-8 sm:gap-12 mt-12 pt-8 border-t border-slate-250/50">
            <div className="text-center group p-4 rounded-2xl hover:bg-slate-200/30 transition-all duration-350">
              <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 block">
                {formatSmartNumber(liveStats.total_organizations)}
              </span>
              <span className="text-xs text-slate-450 block font-semibold uppercase tracking-wider mt-2 group-hover:text-blue-600 transition-colors">
                Active Organizations
              </span>
            </div>
            <div className="text-center group p-4 rounded-2xl hover:bg-slate-200/30 transition-all duration-350">
              <span className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 block">
                {formatSmartNumber(liveStats.total_active_users)}
              </span>
              <span className="text-xs text-slate-450 block font-semibold uppercase tracking-wider mt-2 group-hover:text-indigo-600 transition-colors">
                Active Users
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURES GRID SECTION */}
      <section id="features" className="py-20 sm:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Comprehensive Suite Designed for Scaling Suppliers
          </h2>
          <p className="mt-4 text-base text-slate-500 leading-relaxed">
            Eliminate spreadsheets and fragmented trackers. Leverage a integrated B2B ERP system built with strict organizational boundaries, real-time sync, and security.
          </p>
        </div>

        {/* Features Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div 
                key={index}
                whileHover={{ y: -6, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-6 group-hover:scale-105 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Small illustration effect */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                  <span>Learn workflow</span>
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* WHY CHOOSE US - ALTERNATING COLUMNS */}
      <section className="bg-slate-900 text-white py-20 sm:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-20 sm:mb-28">
            <span className="text-xs font-bold uppercase text-blue-400 tracking-widest block mb-3">Enterprise Grade Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Engineered for Compliance and Stability
            </h2>
          </div>

          <div className="space-y-24 sm:space-y-36">
            
            {/* Column Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              <div className="lg:col-span-5 space-y-6">
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">01</div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Multi-Tenant Context Isolation
                </h3>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Every SQL query, stock transaction, and financial ledger entry is tagged and bound to your unique company workspace. Rest assured that employee roles and data contexts remain strictly contained.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-350">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Database-level schema boundaries</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> No data cross-contamination risks</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Compliant with strict regional regulations</li>
                </ul>
              </div>

              {/* Graphic right */}
              <div className="lg:col-span-7 flex justify-center">
                <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 shadow-xl max-w-[480px] w-full font-mono text-[11px] text-slate-300">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <span className="text-slate-400 flex items-center gap-1"><Terminal className="h-4 w-4 text-blue-400" /> tenant_check.go</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  </div>
                  <pre className="text-blue-300 overflow-x-auto leading-relaxed">
{`func GetSupplierData(ctx context.Context, supplierID string) {
    tenantID := ctx.Value("tenant_id").(string)
    
    // Strict compile-time isolation enforced
    query := DB.Where("tenant_id = ? AND id = ?", tenantID, supplierID)
    
    // Returns isolates object correctly
    return query.Find(&Supplier{})
}`}
                  </pre>
                </div>
              </div>

            </div>

            {/* Column Row 2 (Alternating) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Graphic left (Desktop) */}
              <div className="lg:col-span-7 flex justify-center order-last lg:order-first">
                <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 shadow-xl max-w-[460px] w-full space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Permission Enforcer</span>
                    <span className="text-amber-500">RBAC Active</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-xs font-semibold">Warehouse Stock Correction</span>
                      <span className="text-[9px] bg-red-950 border border-red-900 text-red-400 px-2 py-0.5 rounded font-bold uppercase">Warehouse Manager Role Required</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-xs font-semibold">Purchase Order Approval</span>
                      <span className="text-[9px] bg-blue-950 border border-blue-900 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">Procurement Manager Role Required</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-xs font-semibold">Invoice Ledgers Write</span>
                      <span className="text-[9px] bg-emerald-950 border border-emerald-900 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Accountant Role Required</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Right */}
              <div className="lg:col-span-5 space-y-6">
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">02</div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Granular RBAC Policies
                </h3>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Authorize actions and restrict ledger operations to verify that procurement, warehouse management, and accountants act within their scope. Block unauthorised entries with system-level guards.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-350">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Prevent accidental inventory adjustments</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Audit trail log maps role identities</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Customizable permissions per module</li>
                </ul>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* LIVE INTERACTIVE DASHBOARD PREVIEW */}
      <section id="preview" className="py-20 sm:py-32 bg-slate-50 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Test-Drive the SupplierERP Interface
            </h2>
            <p className="mt-4 text-base text-slate-500">
              Select one of the workspace modules below to preview how our platform helps streamline active operations.
            </p>
          </div>

          {/* Preview Tabs Selector */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8">
            {(["overview", "suppliers", "inventory", "purchases"] as PreviewTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePreviewTab(tab)}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold capitalize transition-all ${
                  activePreviewTab === tab
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab === "purchases" ? "purchase orders" : tab}
              </button>
            ))}
          </div>

          {/* Browser Container with Mock View */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-5xl mx-auto">
            {/* Browser chrome header */}
            <div className="h-11 bg-slate-100 border-b border-slate-200 flex items-center px-4 justify-between select-none">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-slate-300"></div>
                <div className="h-3 w-3 rounded-full bg-slate-300"></div>
                <div className="h-3 w-3 rounded-full bg-slate-300"></div>
              </div>
              <div className="bg-white border border-slate-200 text-[10px] text-slate-450 font-medium px-16 py-1 rounded truncate max-w-xs sm:max-w-md">
                https://erp.suppliererp.com/{activePreviewTab}
              </div>
              <div className="w-10"></div>
            </div>

            {/* Live screen preview */}
            <div className="p-4 sm:p-8 bg-slate-50 min-h-[360px] flex flex-col justify-between">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePreviewTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex-1"
                >
                  
                  {activePreviewTab === "overview" && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 leading-none">Dashboard Overview</h4>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold block mt-1">Multi-tenant context isolation: active</span>
                        </div>
                        <div className="bg-slate-100 text-xs font-semibold px-3 py-1 rounded-lg text-slate-650 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-blue-600" /> Noida Main Depot
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-xl border border-slate-150 shadow-sm">
                          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Procurement Value</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">₹4,95,600.00</span>
                          <span className="text-[9px] text-emerald-600 font-bold mt-1.5 block">↑ +14.2% since last month</span>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-150 shadow-sm">
                          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Low Stock Warnings</span>
                          <span className="text-xl font-black text-rose-600 mt-1 block">2 Warnings</span>
                          <span className="text-[9px] text-rose-500 font-medium mt-1.5 block">Steel Rods, Carton Boxes</span>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-150 shadow-sm">
                          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Ledger Adjustments</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">18 recorded</span>
                          <span className="text-[9px] text-slate-400 font-medium mt-1.5 block">Audit trails fully locked</span>
                        </div>
                      </div>

                      {/* Mini visual ledger log */}
                      <div className="bg-white rounded-xl border border-slate-150 p-4">
                        <h5 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider mb-3">Double-Entry Activity Logs</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                            <div>
                              <span className="font-semibold text-slate-800">High-grade Steel Rods 10mm</span>
                              <span className="text-[9px] text-slate-400 block">Warehouse Noida Depot | Manual Adjustment</span>
                            </div>
                            <span className="font-bold text-emerald-600">+120 tons</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="font-semibold text-slate-800">Corrugated Carton Box - Medium</span>
                              <span className="text-[9px] text-slate-400 block">Warehouse Noida Depot | PO Fulfillment</span>
                            </div>
                            <span className="font-bold text-red-500">-1,200 pcs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreviewTab === "suppliers" && (
                    <div className="space-y-5">
                      <div className="flex justify-between items-center">
                        <h4 className="text-base font-bold text-slate-900">Supplier Registry</h4>
                        <span className="text-[10px] text-blue-600 font-bold">3 active partners</span>
                      </div>
                      
                      <div className="bg-white rounded-xl border border-slate-150 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200 text-slate-450 font-bold uppercase text-[9px]">
                                <th className="p-3">Company Name</th>
                                <th className="p-3">PAN/GST Identification</th>
                                <th className="p-3">Contact Person</th>
                                <th className="p-3">Rating</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-slate-100">
                                <td className="p-3 font-semibold text-slate-850">Supreme Materials Ltd</td>
                                <td className="p-3 font-mono text-slate-500">09AAACS1234F1Z1</td>
                                <td className="p-3 text-slate-650">Rohan Verma</td>
                                <td className="p-3"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">4.8 ★</span></td>
                                <td className="p-3"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span> Active</td>
                              </tr>
                              <tr className="border-b border-slate-100">
                                <td className="p-3 font-semibold text-slate-850">Global Packaging Corp</td>
                                <td className="p-3 font-mono text-slate-500">24AABCG5678H2Z2</td>
                                <td className="p-3 text-slate-650">Neha Patel</td>
                                <td className="p-3"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">4.2 ★</span></td>
                                <td className="p-3"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span> Active</td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-slate-850">Apex Logistics & Co</td>
                                <td className="p-3 font-mono text-slate-500">27AAACA9911K3Z3</td>
                                <td className="p-3 text-slate-650">Vikram Singh</td>
                                <td className="p-3"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">3.9 ★</span></td>
                                <td className="p-3"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 inline-block mr-1"></span> Suspended</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreviewTab === "inventory" && (
                    <div className="space-y-5">
                      <div className="flex justify-between items-center">
                        <h4 className="text-base font-bold text-slate-900">Inventory Distribution</h4>
                        <span className="text-[10px] text-rose-600 font-bold uppercase flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span> 1 Low Stock Warning
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-xl border border-slate-150 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-450 font-mono">MTL-STL-001</span>
                            <h5 className="text-sm font-bold text-slate-950 mt-0.5">High-grade Steel Rods 10mm</h5>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-450">Stock Level</span>
                              <span className="text-rose-600">4 tons left (Reorder: 5)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: "40%" }}></div>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-slate-150 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-450 font-mono">PKG-BOX-M</span>
                            <h5 className="text-sm font-bold text-slate-950 mt-0.5">Corrugated Carton Box - Medium</h5>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-450">Stock Level</span>
                              <span className="text-emerald-600">1,300 pcs left (Reorder: 200)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreviewTab === "purchases" && (
                    <div className="space-y-5">
                      <div className="flex justify-between items-center">
                        <h4 className="text-base font-bold text-slate-900">Active Purchase Orders</h4>
                        <span className="text-[10px] bg-amber-50 border border-amber-250 text-amber-600 px-2 py-0.5 rounded font-bold">1 Draft Awaiting Approval</span>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-150 p-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[10px] text-slate-450 font-mono font-bold">PO-20260624-0001</span>
                            <span className="text-xs font-bold text-slate-900 block mt-0.5">Supreme Materials Ltd</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 block">₹4,20,000.00</span>
                            <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">APPROVED</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-slate-450 font-mono font-bold">PO-20260625-0002</span>
                            <span className="text-xs font-bold text-slate-900 block mt-0.5">Global Packaging Corp</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 block">₹75,600.00</span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">DRAFT</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>

            </div>
          </div>

        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="py-20 sm:py-32 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
            <span className="text-xs font-bold uppercase text-blue-400 tracking-widest block mb-3">Customer Success</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Trusted by Hundreds of Fleet & Logistics Leaders
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-850 p-6 sm:p-8 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-amber-400 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4.5 w-4.5 fill-current" />)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed italic">
                  &ldquo;Transitioning from manual spreadsheets to SupplierERP has reduced our PO turnaround time by 60%. The multi-warehouse stock ledger handles physical movements perfectly with detailed audit trails.&rdquo;
                </p>
              </div>
              <div className="mt-8 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                  RV
                </div>
                <div>
                  <span className="text-xs font-bold block">Rohan Verma</span>
                  <span className="text-[10px] text-slate-400 block">COO, Supreme Materials Ltd</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-850 p-6 sm:p-8 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-amber-400 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4.5 w-4.5 fill-current" />)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed italic">
                  &ldquo;The granular RBAC permission gates are exceptionally robust. Our warehouse managers handle stock correction logs directly, while the procurement managers approve orders. It enforces absolute security.&rdquo;
                </p>
              </div>
              <div className="mt-8 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-xs">
                  NP
                </div>
                <div>
                  <span className="text-xs font-bold block">Neha Patel</span>
                  <span className="text-[10px] text-slate-400 block">Director of Logistics, Global Packaging</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-850 p-6 sm:p-8 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-amber-400 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4.5 w-4.5 fill-current" />)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed italic">
                  &ldquo;The AI ERP assistant has been a game-changer for our finance operations. We can query spend analytics or low-stock predictions using simple conversational queries. It has completely eliminated raw export runs.&rdquo;
                </p>
              </div>
              <div className="mt-8 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs">
                  VS
                </div>
                <div>
                  <span className="text-xs font-bold block">Vikram Singh</span>
                  <span className="text-[10px] text-slate-400 block">Procurement Head, Apex Logistics & Co</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-20 sm:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tailored Plans Built for Your Scale
          </h2>
          <p className="mt-4 text-base text-slate-500 leading-relaxed">
            All subscriptions include strict tenant data isolation. Choose a plan or reach out to customize a dedicated ERP environment.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {pricingTiers.map((tier, index) => (
            <div 
              key={index}
              className={`rounded-2xl p-8 border flex flex-col justify-between relative transition-all duration-300 ${
                tier.popular 
                  ? "bg-white border-blue-500 shadow-xl scale-102 ring-1 ring-blue-500/20" 
                  : "bg-white border-slate-200/80 shadow-sm hover:border-slate-300"
              }`}
            >
              {tier.popular && (
                <span className="absolute top-0 right-1/2 transform translate-x-1/2 translate-y-[-50%] bg-blue-600 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
                  MOST POPULAR PLAN
                </span>
              )}

              <div>
                <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                <p className="mt-2 text-xs text-slate-500">{tier.description}</p>
                
                <div className="my-6 flex items-baseline">
                  <span className="text-4xl font-black text-slate-900 tracking-tight">{tier.price}</span>
                  <span className="text-sm font-semibold text-slate-400 ml-1.5">{tier.period}</span>
                </div>

                <hr className="border-slate-100 my-6" />

                <ul className="space-y-4">
                  {tier.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3 text-xs sm:text-sm text-slate-650">
                      <div className="h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link 
                  href="/sign-in"
                  className={`w-full py-3 rounded-xl font-bold text-center block text-sm transition-all ${
                    tier.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 hover:shadow-blue-600/20"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION (ACCORDION) */}
      <section id="faq" className="py-20 sm:py-32 bg-slate-100 border-y border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-sm text-slate-500">
              Clear queries on compliance, integrations, role policies, and trial configurations.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = faqOpen === index;
              return (
                <div 
                  key={index}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setFaqOpen(isOpen ? null : index)}
                    className="w-full p-5 flex items-center justify-between text-left font-bold text-slate-850 hover:text-blue-600 transition-colors"
                  >
                    <span className="text-sm sm:text-base pr-4">{faq.q}</span>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transform transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-5 pb-5 pt-0.5 text-xs sm:text-sm text-slate-500 leading-relaxed border-t border-slate-100">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-700 to-indigo-850 py-16 px-6 sm:px-12 lg:px-20 text-center shadow-xl shadow-blue-500/10">
          
          {/* Subtle background glow elements */}
          <div className="absolute top-[-50%] left-[-20%] w-[60%] aspect-square rounded-full bg-cyan-400/20 blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-[-50%] right-[-20%] w-[60%] aspect-square rounded-full bg-blue-500/20 blur-[120px] pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Modernize Your Supply Chain Operations?
            </h2>
            <p className="text-sm sm:text-base text-blue-150 leading-relaxed">
              Start your 14-day Professional trial now. Setup your first warehouse and map organizational roles in minutes. No credit card required.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/sign-in" className="w-full sm:w-auto bg-white text-blue-700 hover:bg-slate-100 px-8 py-4 rounded-xl font-bold shadow-lg text-base hover:-translate-y-0.5 transition-all">
                Create Free Account
              </Link>
              <a href="mailto:sales@suppliererp.com" className="w-full sm:w-auto border border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-bold text-base transition-all">
                Talk to Sales Experts
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 pb-12 border-b border-slate-800">
            
            {/* Logo and desc */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/10">
                  SE
                </div>
                <span className="text-lg font-bold text-white tracking-tight">SupplierERP</span>
              </div>
              <p className="text-xs text-slate-450 leading-relaxed max-w-xs">
                Advanced B2B multi-tenant cloud ERP software engineered for suppliers, distributors, and logistics depots. Secure, compliant, and lightning-fast.
              </p>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#preview" className="hover:text-white transition-colors">Live Preview</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Options</a></li>
                <li><a href="/sign-in" className="hover:text-white transition-colors">Portal Access</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Resources</h4>
              <ul className="space-y-2.5 text-xs">
                <li><span className="cursor-not-allowed text-slate-500">Documentation</span></li>
                <li><span className="cursor-not-allowed text-slate-500">API Specifications</span></li>
                <li><span className="cursor-not-allowed text-slate-500">System Guides</span></li>
                <li><span className="cursor-not-allowed text-slate-500">Video Tutorials</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Compliance</h4>
              <ul className="space-y-2.5 text-xs">
                <li><span className="cursor-not-allowed text-slate-500">Privacy Policy</span></li>
                <li><span className="cursor-not-allowed text-slate-500">Terms of Service</span></li>
                <li><span className="cursor-not-allowed text-slate-500">Trust Center</span></li>
                <li><span className="cursor-not-allowed text-slate-500">ISO 27001 Audit</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Enterprise</h4>
              <ul className="space-y-2.5 text-xs">
                <li><span className="cursor-not-allowed text-slate-500">Dedicated Deployments</span></li>
                <li><span className="cursor-not-allowed text-slate-500">SLA Contracts</span></li>
                <li><span className="cursor-not-allowed text-slate-500">Contact Experts</span></li>
                <li>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">All Systems Operational</span>
                  </div>
                </li>
              </ul>
            </div>

          </div>

          {/* Socials / Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} SupplierERP SaaS. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="cursor-not-allowed text-slate-500 hover:text-white transition-colors">Twitter</span>
              <span className="cursor-not-allowed text-slate-500 hover:text-white transition-colors">LinkedIn</span>
              <span className="cursor-not-allowed text-slate-500 hover:text-white transition-colors">GitHub</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
