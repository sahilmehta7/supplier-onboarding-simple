"use client";

import { signOut } from "next-auth/react";

export function handleSessionError(error: Error): boolean {
  if (
    error.message.includes("Unauthorized") ||
    error.message.includes("401")
  ) {
    // Sign out and redirect to sign in
    setTimeout(() => {
      signOut({ callbackUrl: "/signin" });
    }, 2000);

    return true;
  }

  return false;
}

