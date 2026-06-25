"use client";

import React, { useState } from "react";
import { SignIn } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Building, ShieldAlert, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

type PortalType = "client" | "admin" | null;

export default function SignInPage() {
  const [selectedPortal, setSelectedPortal] = useState<PortalType>(null);

  // Set the redirect URL based on selection
  const redirectUrl = selectedPortal === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] aspect-square rounded-full bg-cyan-400/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg flex flex-col items-center gap-6 relative z-10">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            SE
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Supplier<span className="text-blue-600">ERP</span>
          </span>
        </Link>

        <div className="w-full">
          <AnimatePresence mode="wait">
            {!selectedPortal ? (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col items-center"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 px-3 py-1 rounded-full text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-3">
                    <Sparkles className="h-3 w-3 text-cyan-500" />
                    <span>Secure Portal Sign In</span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Select Your Portal
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">
                    Choose the appropriate gateway to access your workspace or configure platform systems.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 w-full">
                  
                  {/* Client Portal Option */}
                  <button
                    id="portal-select-client"
                    onClick={() => setSelectedPortal("client")}
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-blue-50/10 dark:hover:bg-blue-950/10 text-left transition-all group shadow-sm hover:shadow"
                  >
                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-850 dark:text-slate-200 block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Organization Portal
                      </span>
                      <span className="text-xs text-slate-450 dark:text-slate-400 mt-1 block">
                        Access raw materials inventory, purchase orders, multi-warehouse logs, and team shifts.
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 block font-semibold">
                        Redirects to /dashboard
                      </span>
                    </div>
                  </button>

                  {/* Admin Portal Option */}
                  <button
                    id="portal-select-admin"
                    onClick={() => setSelectedPortal("admin")}
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-blue-50/10 dark:hover:bg-blue-950/10 text-left transition-all group shadow-sm hover:shadow"
                  >
                    <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-650 dark:text-slate-400 group-hover:scale-105 transition-transform flex-shrink-0">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-850 dark:text-slate-200 block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Platform Admin Portal
                      </span>
                      <span className="text-xs text-slate-450 dark:text-slate-400 mt-1 block">
                        Manage global configuration schemas, tenant instances, billing tiers, and system metrics.
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 block font-semibold">
                        Redirects to /admin
                      </span>
                    </div>
                  </button>

                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signin"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                
                {/* Back button */}
                <button
                  onClick={() => setSelectedPortal(null)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-450 transition-colors self-start ml-2 sm:ml-4"
                >
                  <ArrowLeft className="h-4 w-4" /> Change Portal Selection
                </button>

                <div className="w-full flex justify-center">
                  <SignIn
                    forceRedirectUrl={redirectUrl}
                    appearance={{
                      elements: {
                        formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl py-3 shadow-md shadow-blue-500/10",
                        card: "border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl bg-white dark:bg-slate-900 w-full",
                        headerTitle: "text-slate-900 dark:text-white font-extrabold tracking-tight",
                        headerSubtitle: "text-slate-500 dark:text-slate-400 text-xs",
                        socialButtonsBlockButton: "border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl",
                        formFieldInput: "border border-slate-200 dark:border-slate-850 focus:border-blue-500 focus:ring-blue-500 rounded-lg bg-slate-50/50 dark:bg-slate-950/20",
                        footerActionLink: "text-blue-600 hover:text-blue-700 font-semibold"
                      }
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
