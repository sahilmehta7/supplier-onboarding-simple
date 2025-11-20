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
 * Enhances error messages with recovery suggestions
 */
function enhanceErrorMessage(message: string): { message: string; suggestion?: string } {
  const lowerMessage = message.toLowerCase();
  
  // Pattern matching for common error types
  if (lowerMessage.includes("required") || lowerMessage.includes("undefined")) {
    return {
      message,
      suggestion: "Please fill in this required field to continue.",
    };
  }
  
  if (lowerMessage.includes("invalid option") || lowerMessage.includes("expected one of")) {
    return {
      message,
      suggestion: "Please select one of the available options from the dropdown.",
    };
  }
  
  if (lowerMessage.includes("regex") || lowerMessage.includes("format") || lowerMessage.includes("pattern")) {
    return {
      message,
      suggestion: "Please check the format and try again. Review the field requirements for the correct format.",
    };
  }
  
  if (lowerMessage.includes("string") && lowerMessage.includes("number")) {
    return {
      message,
      suggestion: "Please enter a valid value in the correct format.",
    };
  }
  
  if (lowerMessage.includes("email")) {
    return {
      message,
      suggestion: "Please enter a valid email address (e.g., name@example.com).",
    };
  }
  
  return { message };
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
        "rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{title}</h3>
          <ul className="list-inside list-disc space-y-2 text-sm text-red-700 dark:text-red-300">
            {errorEntries.map(([fieldKey, message]) => {
              const enhanced = enhanceErrorMessage(message);
              return (
                <li key={fieldKey} className="space-y-1">
                  {onErrorClick ? (
                    <button
                      type="button"
                      onClick={() => onErrorClick(fieldKey)}
                      className="text-left underline hover:text-red-900 dark:hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded transition-colors"
                    >
                      {enhanced.message}
                    </button>
                  ) : (
                    <span>{enhanced.message}</span>
                  )}
                  {enhanced.suggestion && (
                    <p className="ml-4 text-xs text-red-600 dark:text-red-400 italic">
                      💡 {enhanced.suggestion}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

