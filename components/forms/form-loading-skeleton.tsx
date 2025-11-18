"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function FormLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-2 w-full" />
      </div>
      <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-2 w-full" />
      </div>
    </div>
  );
}

