"use client";

import { SignIn } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Platform Control Center</h1>
          <p className="text-sm text-slate-400">Administrator access only</p>
        </div>

        {/* Clerk Sign-In Widget or fallback */}
        <div className="flex justify-center">
          {isClerkConfigured ? (
            <SignIn
              forceRedirectUrl="/"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl",
                  headerTitle: "text-white",
                  headerSubtitle: "text-slate-400",
                  socialButtonsBlockButton:
                    "bg-slate-800 border-slate-700 text-white hover:bg-slate-700",
                  dividerLine: "bg-slate-700",
                  dividerText: "text-slate-500",
                  formFieldLabel: "text-slate-300",
                  formFieldInput:
                    "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500",
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                  footerActionLink: "text-blue-400 hover:text-blue-300",
                  identityPreviewText: "text-white",
                  identityPreviewEditButton: "text-blue-400",
                },
              }}
            />
          ) : (
            <div className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl p-8 text-center space-y-4">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                <span className="text-amber-400 text-lg">⚠</span>
              </div>
              <p className="text-sm font-semibold text-slate-300">
                Authentication Not Configured
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Set{" "}
                <code className="text-blue-400 bg-slate-800 px-1 py-0.5 rounded text-[10px]">
                  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                </code>{" "}
                in your Vercel environment variables for this project to enable
                administrator sign-in.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
