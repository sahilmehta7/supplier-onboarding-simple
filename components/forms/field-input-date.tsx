"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "./field-wrapper";
import { cn } from "@/lib/utils";
import type { FormField } from "@prisma/client";

interface FieldInputDateProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
}

/**
 * Date picker field component
 * Note: This uses a native HTML5 date input. For more advanced date pickers,
 * consider integrating a library like react-day-picker or similar.
 */
export function FieldInputDate({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  touched = true,
}: FieldInputDateProps) {
  const fieldId = `field-${field.id}`;
  const hasError = Boolean(error);
  const validation = field.validation as
    | { min?: string; max?: string }
    | null
    | undefined;

  // Format value for date input (YYYY-MM-DD)
  const formattedValue = React.useMemo(() => {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      // Convert to ISO string for storage
      const date = new Date(dateValue);
      onChange(date.toISOString());
    } else {
      onChange("");
    }
  };

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
        type="date"
        value={formattedValue}
        onChange={handleChange}
        onBlur={onBlur}
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

