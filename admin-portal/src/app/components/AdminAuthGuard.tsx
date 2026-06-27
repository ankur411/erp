"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CLIENT_PORTAL_URL =
  process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || "https://erp-delta-hazel.vercel.app";

type GuardState = "checking" | "authorized" | "unauthorized" | "error";

/**
 * AdminAuthGuard
 *
 * Wraps the admin portal content. On mount, calls POST /auth/me to
 * verify the signed-in user has the platform_admin role in TiDB.
 *
 * - Checking  → shows a loading spinner
 * - Authorized → renders children (the admin dashboard)
 * - Unauthorized → redirects to the client portal
 * - Error (backend unreachable / not migrated) → shows bypass option
 */
export default function AdminAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setGuardState] = useState<GuardState>("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const checked = useRef(false);

  useEffect(() => {
    if (!isLoaded || checked.current) return;
    checked.current = true;

    if (!isSignedIn) {
      window.location.href = "/sign-in";
      return;
    }

    async function checkAdmin() {
      try {
        const token = await getToken();
        if (!token) {
          window.location.href = "/sign-in";
          return;
        }

        const res = await fetch(`${API_URL}/api/v1/system/auth/me`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.is_platform_admin) {
            setGuardState("authorized");
          } else {
            setGuardState("unauthorized");
            setTimeout(() => {
              window.location.href = CLIENT_PORTAL_URL;
            }, 2000);
          }
        } else if (res.status === 404 || res.status === 422) {
          // /auth/me endpoint not yet deployed — allow access with warning
          setErrorMsg(
            `Backend /auth/me returned ${res.status}. The migration may not have run yet. Allowing access — role not verified.`
          );
          setGuardState("error");
        } else {
          setErrorMsg(`Backend error: ${res.status}`);
          setGuardState("error");
        }
      } catch (e) {
        // Backend unreachable (cold start, not deployed) — allow access with warning
        setErrorMsg(
          "Could not reach backend for role verification. Allowing access — ensure the backend is deployed and the DB migration has run."
        );
        setGuardState("error");
      }
    }

    checkAdmin();
  }, [isLoaded, isSignedIn, getToken]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === "checking") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="relative h-12 w-12">
          <div className="h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 013 12c0 2.784.952 5.346 2.532 7.374M12 21a11.955 11.955 0 006.402-1.874M21 12c0-2.784-.952-5.346-2.532-7.374" />
            </svg>
          </div>
          <div className="absolute -inset-1 rounded-[14px] border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-slate-400">Verifying admin privileges…</p>
      </div>
    );
  }

  // ── Unauthorized ─────────────────────────────────────────────────────────
  if (state === "unauthorized") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="text-red-400 text-2xl">🚫</span>
        </div>
        <p className="text-sm font-bold text-white">Access Denied</p>
        <p className="text-xs text-slate-500">
          Your account does not have Platform Admin privileges.
          <br />Redirecting you to the client portal…
        </p>
      </div>
    );
  }

  // ── Backend error — allow with warning banner ────────────────────────────
  if (state === "error") {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center">
          <p className="text-[10px] font-semibold text-amber-400">
            ⚠ Role verification skipped: {errorMsg}
          </p>
        </div>
        <div className="pt-8">{children}</div>
      </>
    );
  }

  // ── Authorized ───────────────────────────────────────────────────────────
  return <>{children}</>;
}
