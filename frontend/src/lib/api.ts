import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useApi() {
  const { getToken } = useAuth();

  const authFetch = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    
    // Add default JSON Content-Type if body is present and not FormData
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    
    try {
      const token = await getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch (e) {
      console.warn("Failed to retrieve Clerk token:", e);
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
