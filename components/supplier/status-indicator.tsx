"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  isPolling: boolean;
  className?: string;
}

export function StatusIndicator({ isPolling, className }: StatusIndicatorProps) {
  if (!isPolling) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className
      )}
      aria-live="polite"
      aria-label="Checking for status updates"
    >
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>Checking for updates...</span>
    </div>
  );
}

