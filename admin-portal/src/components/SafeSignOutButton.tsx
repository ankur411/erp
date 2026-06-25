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
  return (
    <button onClick={() => router.push("/sign-in")} className={className} {...props}>
      {children}
    </button>
  );
}
