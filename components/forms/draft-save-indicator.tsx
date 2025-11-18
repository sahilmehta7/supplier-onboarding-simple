"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { AutosaveStatus } from "@/hooks/use-autosave";

export type DraftStatus = AutosaveStatus;

interface DraftSaveIndicatorProps {
  status: DraftStatus;
  lastSavedAt?: Date | string | null;
  errorMessage?: string;
  className?: string;
}

function getReadableTimestamp(input?: Date | string | null): string | null {
  if (!input) {
    return null;
  }

  const date =
    typeof input === "string" ? new Date(input) : input instanceof Date ? input : null;

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

export function DraftSaveIndicator({
  status,
  lastSavedAt,
  errorMessage,
  className,
}: DraftSaveIndicatorProps) {
  const readableTimestamp = getReadableTimestamp(lastSavedAt);
  let icon = <Save className="size-4" aria-hidden="true" />;
  let message = readableTimestamp ? `Draft saved ${readableTimestamp}` : "Draft not saved yet";

  if (status === "saving") {
    icon = <Loader2 className="size-4 animate-spin" aria-hidden="true" />;
    message = "Saving draft…";
  } else if (status === "saved" && readableTimestamp) {
    icon = <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />;
    message = `Draft saved ${readableTimestamp}`;
  } else if (status === "error") {
    icon = <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />;
    message = errorMessage ?? "Unable to save draft. Please try again.";
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground",
        status === "error" && "text-destructive",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {icon}
      <span>{message}</span>
    </div>
  );
}

