const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useApi() {
  const authFetch = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    
    let token: string | null = null;
    if (typeof window !== "undefined") {
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
