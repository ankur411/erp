import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Protect all routes except the public ones (like login, signup, webhooks)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)"
]);

export default clerkMiddleware(async (auth, request) => {
  const isClerkEnabled = process.env.ENABLE_CLERK === "true" || !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  if (isClerkEnabled) {
    const isPublic = isPublicRoute(request);
    if (!isPublic) {
      await auth.protect();
    }
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
