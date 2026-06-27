import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that never require auth
const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/auth/callback",
  "/api/webhooks"
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + "/"));
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const { pathname } = url;
  const hostname = request.headers.get("host") || "";

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const hostnameWithoutPort = hostname.split(":")[0].toLowerCase();
  const rootDomainWithoutPort = rootDomain.split(":")[0].toLowerCase();

  let tenantSlug: string | null = null;
  if (hostnameWithoutPort.endsWith(`.${rootDomainWithoutPort}`)) {
    tenantSlug = hostnameWithoutPort.substring(
      0,
      hostnameWithoutPort.length - rootDomainWithoutPort.length - 1
    );
  }
  if (tenantSlug === "www") tenantSlug = null;

  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) requestHeaders.set("x-tenant-slug", tenantSlug);

  // If public route, just proceed
  if (isPublicRoute(pathname) || pathname.startsWith("/_next") || pathname.includes(".")) {
    // Rewrite root path to /dashboard on tenant subdomains
    if (tenantSlug && pathname === "/") {
      url.pathname = "/dashboard";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Check local auth token
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    // Redirect to sign-in
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Validate session against backend /auth/me
  const isNoOrgRoute = pathname.startsWith("/no-organization");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  try {
    const meResponse = await fetch(`${apiUrl}/api/v1/system/auth/me`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (meResponse.ok) {
      const userData = await meResponse.json();

      // Platform admins belong in the admin portal, not here
      if (userData.is_platform_admin) {
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "https://erp-admin-nine.vercel.app";
        return NextResponse.redirect(adminUrl);
      }

      // Users without an org go to /no-organization
      if (!userData.org_id && !isNoOrgRoute) {
        return NextResponse.redirect(new URL("/no-organization", request.url));
      }
    } else {
      // Token invalid or expired - redirect to sign-in and clear cookie
      const response = NextResponse.redirect(new URL("/sign-in", request.url));
      response.cookies.delete("auth_token");
      return response;
    }
  } catch (err) {
    console.error("Backend auth check failed in middleware:", err);
    // Backend unreachable - allow request but log warning
  }

  // Rewrite root path to /dashboard on tenant subdomains
  if (tenantSlug && pathname === "/") {
    url.pathname = "/dashboard";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|webp|jpg|jpeg|ico|csv|txt|xml|otf|ttf|woff|woff2)).*)",
    "/(api|trpc)(.*)",
  ],
};
