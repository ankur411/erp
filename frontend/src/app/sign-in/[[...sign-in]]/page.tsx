"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_PORTAL_URL = process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "https://erp-admin-nine.vercel.app";

export default function SignInPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/system/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Invalid email or password");
      }

      const data = await response.json();
      
      // Store token in cookie (for middleware) and localStorage (for client-side)
      document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
      localStorage.setItem("auth_token", data.access_token);
      
      // Redirect based on user role and organization status
      if (data.user.is_platform_admin) {
        window.location.href = ADMIN_PORTAL_URL;
        return;
      }

      if (data.user.org_id) {
        router.push("/dashboard");
      } else {
        router.push("/no-organization");
      }
      
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 relative overflow-hidden font-sans">
      {/* Left side — branding panel */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-blue-900/10 to-slate-950 pointer-events-none" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-60 h-60 rounded-full bg-cyan-400/8 blur-[60px] pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              SE
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Supplier<span className="text-blue-400">ERP</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-blue-300 tracking-wider uppercase">
                Enterprise ERP Platform
              </span>
            </div>
            <h1 className="text-4xl font-black text-white leading-[1.1] tracking-tight">
              Your operations,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                unified.
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Manage suppliers, purchase orders, inventory, and finances —
              all from one intelligent workspace.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {[
              "Multi-Warehouse Inventory",
              "Supplier Management",
              "Purchase Orders",
              "Financial Ledger",
              "Team Roles",
            ].map((feature) => (
              <span
                key={feature}
                className="px-3 py-1 text-[11px] font-semibold rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] text-slate-600 font-medium">
            © 2025 SupplierERP. All rights reserved.
          </p>
        </div>
      </motion.div>

      {/* Right side — sign-in form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-1 items-center justify-center p-6 lg:p-12 bg-slate-950 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-tl from-blue-900/5 via-transparent to-transparent pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-base tracking-wider shadow-lg shadow-blue-500/30 mx-auto">
              SE
            </div>
            <p className="text-lg font-bold text-white">
              Supplier<span className="text-blue-400">ERP</span>
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500">
              Sign in to continue to your workspace. You&apos;ll be redirected
              automatically based on your role.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/80 border border-slate-800 shadow-2xl shadow-black/50 backdrop-blur-sm rounded-2xl p-8 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 transition-all duration-250 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-600 transition-all duration-250 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl py-2.5 text-sm transition-all duration-250 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
