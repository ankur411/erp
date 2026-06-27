import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Only the sign-in page is public
const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  // Allow sign-in page through without auth
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  const isClerkEnabled =
    process.env.ENABLE_CLERK === "true" ||
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!isClerkEnabled) {
    return NextResponse.next();
  }

  // Ensure the user is signed in via Clerk.
  // If not authenticated, Clerk redirects to /sign-in automatically.
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // The platform_admin role check is intentionally done client-side
  // in the admin portal page (AdminAuthGuard), NOT here.
  //
  // Reason: middleware runs on every request before the backend is warm.
  // A backend call here would fail on cold starts or before the DB
  // migration has run, causing a redirect loop back to /sign-in.
  //
  // The AdminAuthGuard component in page.tsx handles the role check
  // and redirects non-admins to the client portal URL.
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|webp|jpg|jpeg|ico|csv|txt|xml|otf|ttf|woff|woff2)).*)",
    "/(api|trpc)(.*)",
  ],
};
