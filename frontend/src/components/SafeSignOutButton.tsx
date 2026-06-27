"use client";

import React from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface SafeSignOutButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

export function SafeSignOutButton({ children, className, ...props }: SafeSignOutButtonProps) {
  const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  if (!isClerkEnabled) {
    return <MockSignOutButton className={className} {...props}>{children}</MockSignOutButton>;
  }
  return <ClerkSignOutButton className={className} {...props}>{children}</ClerkSignOutButton>;
}

function ClerkSignOutButton({ children, className, ...props }: SafeSignOutButtonProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Clerk signout failed", e);
    }
    router.push("/sign-in");
  };

  return (
    <button onClick={handleSignOut} className={className} {...props}>
      {children}
    </button>
  );
}

function MockSignOutButton({ children, className, ...props }: SafeSignOutButtonProps) {
  const router = useRouter();
  
  const handleSignOut = () => {
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    localStorage.removeItem("auth_token");
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <button onClick={handleSignOut} className={className} {...props}>
      {children}
    </button>
  );
}
