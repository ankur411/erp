import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes that never require auth
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth/callback(.*)",
  "/api/webhooks(.*)"
]);

// Routes that are valid without an org (so we don't loop-redirect)
const isNoOrgRoute = createRouteMatcher(["/no-organization(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const url = request.nextUrl;
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

  const isClerkEnabled =
    process.env.ENABLE_CLERK === "true" ||
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (isClerkEnabled) {
    if (!isPublicRoute(request)) {
      // Protect the route — redirects to /sign-in if not authenticated
      await auth.protect();

      // /no-organization is valid for authenticated users without an org
      if (isNoOrgRoute(request)) {
        return NextResponse.next({ request: { headers: requestHeaders } });
      }

      // Role-based routing via backend /auth/me
      const session = await auth();
      const token = await session.getToken();

      if (token) {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        try {
          const meResponse = await fetch(
            `${apiUrl}/api/v1/system/auth/me`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (meResponse.ok) {
            const userData = await meResponse.json();

            // Platform admins belong in the admin portal, not here
            if (userData.is_platform_admin) {
              const adminUrl =
                process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL ||
                "https://erp-admin-nine.vercel.app";
              return NextResponse.redirect(adminUrl);
            }

            // Users without an org go to /no-organization
            if (!userData.org_id) {
              return NextResponse.redirect(
                new URL("/no-organization", request.url)
              );
            }
          }
        } catch {
          // Backend unreachable — let the page handle it gracefully
        }
      }
    }
  }

  // Rewrite root path to /dashboard on tenant subdomains
  if (tenantSlug && url.pathname === "/") {
    url.pathname = "/dashboard";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|webp|jpg|jpeg|ico|csv|txt|xml|otf|ttf|woff|woff2)).*)",
    "/(api|trpc)(.*)",
  ],
};
