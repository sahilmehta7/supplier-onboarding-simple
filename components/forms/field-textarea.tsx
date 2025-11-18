"use client";

import * as React from "react";
import { FieldWrapper } from "./field-wrapper";
import { cn } from "@/lib/utils";
import type { FormField } from "@prisma/client";

interface FieldTextareaProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
}

/**
 * Textarea field component
 */
export function FieldTextarea({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  touched = true,
}: FieldTextareaProps) {
  const fieldId = `field-${field.id}`;
  const hasError = Boolean(error);
  const validation = field.validation as
    | { minLength?: number; maxLength?: number }
    | null
    | undefined;

  const describedBy = [
    hasError ? `${fieldId}-error` : null,
    field.helpText ? `${fieldId}-help` : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <FieldWrapper field={field} error={error} touched={touched}>
      <textarea
        id={fieldId}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={field.placeholder ?? undefined}
        disabled={disabled}
        minLength={validation?.minLength}
        maxLength={validation?.maxLength}
        rows={4}
        required={field.required}
        aria-invalid={hasError}
        aria-required={field.required}
        aria-describedby={describedBy}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background/80 px-3 py-2 text-base shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          hasError && "border-destructive focus-visible:ring-destructive/30"
        )}
      />
    </FieldWrapper>
  );
}

