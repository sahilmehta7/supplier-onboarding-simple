"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FormField } from "@prisma/client";

interface FieldInputCheckboxProps {
  field: FormField;
  value: boolean;
  onChange: (value: boolean) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
}

/**
 * Checkbox field component
 */
export function FieldInputCheckbox({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  touched = true,
}: FieldInputCheckboxProps) {
  const fieldId = `field-${field.id}`;
  const hasError = Boolean(error);
  const showError = touched && hasError;
  const describedBy = [
    showError ? `${fieldId}-error` : null,
    field.helpText ? `${fieldId}-help` : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm focus-within:border-primary focus-within:shadow-md transition-all">
      <div className="flex items-center space-x-2">
        <input
          id={fieldId}
          type="checkbox"
          checked={value ?? false}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
          disabled={disabled}
          required={field.required}
          aria-invalid={showError}
          aria-required={field.required}
          aria-describedby={describedBy}
          className={cn(
            "h-4 w-4 rounded border border-input shadow-xs transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showError && "border-destructive",
            "checked:bg-primary checked:border-primary"
          )}
        />
        <Label
          htmlFor={fieldId}
          className="text-sm font-medium cursor-pointer"
        >
          {field.label}
          {field.required && (
            <span className="ml-0.5 text-destructive" aria-label="required">
              *
            </span>
          )}
        </Label>
      </div>
      {field.helpText && (
        <p
          id={`${fieldId}-help`}
          className="text-xs text-muted-foreground"
        >
          {field.helpText}
        </p>
      )}
      {showError && (
        <p
          id={`${fieldId}-error`}
          className="text-xs text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

