import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Protect all routes except the public ones (like home, login, signup, webhooks)
const isClientPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)"
]);

export default clerkMiddleware(async (auth, request) => {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  
  // Define root domain (e.g. localhost:3000 or myerp.com)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const hostnameWithoutPort = hostname.split(":")[0].toLowerCase();
  const rootDomainWithoutPort = rootDomain.split(":")[0].toLowerCase();
  
  let tenantSlug: string | null = null;
  
  // Check if it is a subdomain
  if (hostnameWithoutPort.endsWith(`.${rootDomainWithoutPort}`)) {
    tenantSlug = hostnameWithoutPort.substring(0, hostnameWithoutPort.length - rootDomainWithoutPort.length - 1);
  }
  
  if (tenantSlug === "www") {
    tenantSlug = null;
  }
  
  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  }
  
  const isClerkEnabled = process.env.ENABLE_CLERK === "true" || !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (isClerkEnabled) {
    const isPublic = isClientPublicRoute(request);
    if (!isPublic) {
      await auth.protect();
    }
  }

  // Rewrite root path to /dashboard on tenant subdomains
  if (tenantSlug && url.pathname === "/") {
    url.pathname = "/dashboard";
    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders
      }
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|webp|jpg|jpeg|webp|ico|csv|txt|xml|otf|ttf|woff|woff2)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
