"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "./field-wrapper";
import { cn } from "@/lib/utils";
import type { FormField } from "@prisma/client";

interface FieldInputEmailProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
}

/**
 * Email input field component
 */
export function FieldInputEmail({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  touched = true,
}: FieldInputEmailProps) {
  const fieldId = `field-${field.id}`;
  const hasError = Boolean(error);
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
        type="email"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={field.placeholder ?? undefined}
        disabled={disabled}
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

