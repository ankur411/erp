"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] aspect-square rounded-full bg-cyan-400/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md flex flex-col items-center gap-6 relative z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            SE
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Supplier<span className="text-blue-400">ERP</span>
          </span>
        </Link>

        {/* Message Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Registration Closed</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              To join SupplierERP, you must be invited by your organization administrator. 
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              If your company is new to SupplierERP, please sign in or register through the onboarding flow.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/sign-in"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
            >
              Go to Sign In
            </Link>
            <Link
              href="/"
              className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-medium rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
