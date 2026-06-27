"use client";

import React, { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_PORTAL_URL =
  process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "https://erp-admin-nine.vercel.app";

/**
 * /auth/callback
 *
 * Landing page after Clerk authentication. Calls the backend /auth/me endpoint
 * to determine the user's role and organization membership, then redirects:
 *
 *   platform_admin  →  Admin Portal URL (separate Next.js app)
 *   org user        →  /dashboard
 *   no org          →  /no-organization
 *
 * This page is intentionally minimal — it only shows a loading spinner.
 * The actual UI experience starts after the redirect.
 */
export default function AuthCallbackPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasRedirected.current) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    async function resolveAndRedirect() {
      hasRedirected.current = true;

      try {
        const token = await getToken();
        if (!token) {
          router.replace("/sign-in");
          return;
        }

        const response = await fetch(`${API_URL}/api/v1/system/auth/me`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const userData = await response.json();

          if (userData.is_platform_admin) {
            // Platform admins go to the standalone admin portal
            window.location.href = ADMIN_PORTAL_URL;
            return;
          }

          if (userData.org_id) {
            // Org users go to the main dashboard
            router.replace("/dashboard");
            return;
          }

          // No organization — go to onboarding
          router.replace("/no-organization");
          return;
        }

        // Backend error — fallback to dashboard and let middleware handle it
        console.warn(
          "[auth/callback] /auth/me returned non-OK status:",
          response.status
        );
        router.replace("/dashboard");
      } catch (error) {
        console.error("[auth/callback] Failed to resolve user role:", error);
        // Fallback — middleware will handle the final redirect
        router.replace("/dashboard");
      }
    }

    resolveAndRedirect();
  }, [isLoaded, isSignedIn, getToken, router]);

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
          Setting up your workspace
        </p>
        <p className="text-xs text-slate-600">
          Verifying credentials and determining your access level…
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
