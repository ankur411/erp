"use client";

import React from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
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

        <div className="w-full flex justify-center">
          <SignUp
            forceRedirectUrl="/dashboard"
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

      </div>
    </div>
  );
}
