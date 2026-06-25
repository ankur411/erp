import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Protect all routes except the public ones (like home, login, signup, webhooks)
const isClientPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)"
]);

const isAdminPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)"
]);

export default clerkMiddleware(async (auth, request) => {
  const isClerkEnabled = process.env.ENABLE_CLERK === "true" || !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isAdminDeployment = process.env.NEXT_PUBLIC_IS_ADMIN_DEPLOYMENT === "true";
  const url = request.nextUrl.clone();

  // Environmental Routing & Isolation
  if (isAdminDeployment) {
    // Rewrite root page '/' to '/admin' so the Admin Portal acts as the home page
    if (url.pathname === "/") {
      url.pathname = "/admin";
    }
  } else {
    // Client Deployment: Prevent access to '/admin'
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (isClerkEnabled) {
    const isPublic = isAdminDeployment ? isAdminPublicRoute(request) : isClientPublicRoute(request);
    if (!isPublic) {
      await auth.protect();
    }
  }

  // Return the rewritten URL if we mapped root to '/admin' on admin deployment
  if (isAdminDeployment && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|webp|jpg|jpeg|webp|ico|csv|txt|xml|otf|ttf|woff|woff2)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
