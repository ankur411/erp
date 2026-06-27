import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Sign-in is the only public route — all others require platform_admin
const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

const CLIENT_PORTAL_URL =
  process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || "https://erp-delta-hazel.vercel.app";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default clerkMiddleware(async (auth, request) => {
  // Always allow sign-in page
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  const isClerkEnabled =
    process.env.ENABLE_CLERK === "true" ||
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!isClerkEnabled) {
    return NextResponse.next();
  }

  // Enforce authentication — redirects to /sign-in if not signed in
  await auth.protect();

  // Verify platform_admin role via backend /auth/me
  const session = await auth();
  const token = await session.getToken();

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    const meResponse = await fetch(`${API_URL}/api/v1/system/auth/me`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (meResponse.ok) {
      const userData = await meResponse.json();

      // Only platform admins may access this portal
      if (!userData.is_platform_admin) {
        // Non-admins get redirected back to the client portal
        return NextResponse.redirect(CLIENT_PORTAL_URL);
      }

      // Platform admin — allow access
      return NextResponse.next();
    }

    // Backend returned an error — deny and go to sign-in
    return NextResponse.redirect(new URL("/sign-in", request.url));
  } catch {
    // Backend unreachable — fail secure
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|webp|jpg|jpeg|ico|csv|txt|xml|otf|ttf|woff|woff2)).*)",
    "/(api|trpc)(.*)",
  ],
};
