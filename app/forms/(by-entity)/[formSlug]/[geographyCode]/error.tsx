"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FormError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error("Form error:", error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border p-8">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-center text-sm text-muted-foreground">
          {error.message || "An error occurred while loading the form."}
        </p>
        <div className="flex gap-2">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

