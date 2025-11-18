"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function StepLoadingSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
      <Skeleton className="h-6 w-56" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 sm:col-span-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

