/**
 * Field error display component
 */

"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FieldErrorProps {
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Optional class name
   */
  className?: string;
  /**
   * Optional ID for the error element (for aria-describedby)
   */
  id?: string;
  /**
   * Whether the field has been touched/interacted with
   */
  touched?: boolean;
}

/**
 * Displays an error message for a form field
 */
export function FieldError({
  error,
  className,
  id,
  touched = true,
}: FieldErrorProps) {
  // Only show error if field has been touched
  if (!error || !touched) {
    return null;
  }

  return (
    <div
      id={id}
      className={cn("flex items-start gap-1.5 text-xs text-red-600", className)}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
}

