"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "./field-wrapper";
import { cn } from "@/lib/utils";
import type { FormField } from "@prisma/client";

interface FieldInputNumberProps {
  field: FormField;
  value: number | string;
  onChange: (value: number | string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
}

/**
 * Number input field component
 */
export function FieldInputNumber({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  touched = true,
}: FieldInputNumberProps) {
  const fieldId = `field-${field.id}`;
  const hasError = Boolean(error);
  const validation = field.validation as
    | { min?: number; max?: number }
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
      <Input
        id={fieldId}
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          // Allow empty string for optional fields
          if (val === "") {
            onChange("");
          } else {
            const num = Number(val);
            if (!isNaN(num)) {
              onChange(num);
            }
          }
        }}
        onBlur={onBlur}
        placeholder={field.placeholder ?? undefined}
        disabled={disabled}
        min={validation?.min}
        max={validation?.max}
        required={field.required}
        aria-invalid={hasError}
        aria-required={field.required}
        aria-describedby={describedBy}
        className={cn(
          "text-base",
          hasError && "border-destructive focus-visible:ring-destructive"
        )}
      />
    </FieldWrapper>
  );
}

