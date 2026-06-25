"use client";

import React, { useState } from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, UserPlus, Mail, Lock, Building } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleMockSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setTimeout(() => {
      setIsRegistering(false);
      router.push("/dashboard");
    }, 800);
  };

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
          {isClerkEnabled ? (
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
          ) : (
            /* Premium Mock Registration Form */
            <form 
              onSubmit={handleMockSignUp}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full flex flex-col gap-5"
            >
              <div className="text-center mb-2">
                <div className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-2">
                  <span>Demonstration Mode Active</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Create Your Demo Workspace
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Start your 14-day free preview instantly. No credit card required.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                    Organization Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Acme Logistics Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-sm focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      placeholder="admin@acmelogistics.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-sm focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-sm focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl py-3 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 transition-colors mt-2"
              >
                {isRegistering ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> Create Workspace
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 dark:text-slate-450 mt-1">
                Already have a workspace?{" "}
                <Link href="/sign-in" className="text-blue-650 hover:text-blue-700 font-semibold">
                  Sign In
                </Link>
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
