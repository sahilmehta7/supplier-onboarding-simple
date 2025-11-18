/**
 * Error summary component for displaying form validation errors
 */

"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormErrorSummaryProps {
  /**
   * Map of field keys to error messages
   */
  errors: Record<string, string>;
  /**
   * Optional title for the error summary
   */
  title?: string;
  /**
   * Optional class name
   */
  className?: string;
  /**
   * Optional callback when clicking on an error (to focus the field)
   */
  onErrorClick?: (fieldKey: string) => void;
}

/**
 * Displays a summary of form validation errors
 */
export function FormErrorSummary({
  errors,
  title = "Please fix the following errors:",
  className,
  onErrorClick,
}: FormErrorSummaryProps) {
  const errorEntries = Object.entries(errors);

  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 p-4",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
            {errorEntries.map(([fieldKey, message]) => (
              <li key={fieldKey}>
                {onErrorClick ? (
                  <button
                    type="button"
                    onClick={() => onErrorClick(fieldKey)}
                    className="text-left underline hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                  >
                    {message}
                  </button>
                ) : (
                  <span>{message}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

