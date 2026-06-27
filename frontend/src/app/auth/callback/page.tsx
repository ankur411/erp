"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /auth/callback
 *
 * Safe client-side redirect page that immediately transitions the user to the dashboard.
 * This prevents any build-time prerendering exceptions from third-party identity providers.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      {/* Animated logo */}
      <div className="relative">
        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg tracking-wider shadow-2xl shadow-blue-500/30">
          SE
        </div>
        {/* Spinning ring */}
        <div className="absolute -inset-1 rounded-[18px] border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-slate-300">
          Redirecting to Dashboard
        </p>
        <p className="text-xs text-slate-600">
          Please wait while we load your workspace…
        </p>
      </div>
    </div>
  );
}
