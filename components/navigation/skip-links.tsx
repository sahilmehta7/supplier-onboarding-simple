"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-4 focus-within:z-50">
      <nav aria-label="Skip links">
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href="#main-content"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Skip to main content
            </Link>
          </li>
          <li>
            <Link
              href="#navigation"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Skip to navigation
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

