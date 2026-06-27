import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function useApi() {
  const clerkAuth = isClerkConfigured ? useAuth() : null;

  const authFetch = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    
    // Add default JSON Content-Type if body is present and not FormData
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    
    let token: string | null = null;
    if (isClerkConfigured && clerkAuth) {
      try {
        token = await clerkAuth.getToken();
      } catch (e) {
        console.warn("Failed to retrieve Clerk token:", e);
      }
    } else if (typeof window !== "undefined") {
      token = localStorage.getItem("auth_token");
      if (!token) {
        token = document.cookie.match(/auth_token=([^;]+)/)?.[1] || null;
      }
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const url = path.startsWith("http") ? path : `${API_URL}${path}`;
    
    const res = await fetch(url, {
      ...options,
      headers,
    });

    return res;
  };

  return { authFetch, API_URL };
}
