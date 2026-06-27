"use client";

import React from "react";
import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SignInPage() {
  const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <div className="flex min-h-screen bg-slate-950 relative overflow-hidden">
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

          {isClerkEnabled ? (
            <SignIn
              forceRedirectUrl="/auth/callback"
              appearance={{
                elements: {
                  card: "bg-slate-900/80 border border-slate-800 shadow-2xl shadow-black/50 backdrop-blur-sm",
                  headerTitle: "text-white font-bold",
                  headerSubtitle: "text-slate-400 text-xs",
                  formButtonPrimary:
                    "bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 shadow-lg shadow-blue-500/20 transition-all",
                  socialButtonsBlockButton:
                    "border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl transition-all",
                  formFieldInput:
                    "bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500 focus:ring-blue-500/20",
                  formFieldLabel: "text-slate-300 text-xs font-semibold",
                  dividerLine: "bg-slate-800",
                  dividerText: "text-slate-600 text-xs",
                  footerActionLink: "text-blue-400 hover:text-blue-300 font-semibold",
                  identityPreviewText: "text-white",
                  identityPreviewEditButton: "text-blue-400 hover:text-blue-300",
                  otpCodeFieldInput: "bg-slate-800 border-slate-700 text-white",
                },
              }}
            />
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                <span className="text-amber-400 text-lg">⚠</span>
              </div>
              <p className="text-sm font-semibold text-slate-300">
                Authentication Not Configured
              </p>
              <p className="text-xs text-slate-500">
                Set <code className="text-blue-400">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in your environment to enable sign-in.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
