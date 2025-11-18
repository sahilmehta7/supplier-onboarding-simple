"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldWrapper } from "./field-wrapper";
import { cn } from "@/lib/utils";
import type { FormField } from "@prisma/client";

interface FieldInputSelectProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
}

/**
 * Select dropdown field component
 */
export function FieldInputSelect({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  touched = true,
}: FieldInputSelectProps) {
  const fieldId = `field-${field.id}`;
  const hasError = Boolean(error);
  const describedBy = [
    hasError ? `${fieldId}-error` : null,
    field.helpText ? `${fieldId}-help` : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  // Extract options from field.options JSON
  const options = React.useMemo(() => {
    if (!field.options || typeof field.options !== "object") return [];
    const optionsObj = field.options as Record<string, unknown>;
    if ("values" in optionsObj && Array.isArray(optionsObj.values)) {
      return optionsObj.values.filter(
        (v): v is string => typeof v === "string"
      );
    }
    return [];
  }, [field.options]);

  return (
    <FieldWrapper field={field} error={error} touched={touched}>
      <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={fieldId}
          onBlur={onBlur}
          aria-invalid={hasError}
          aria-required={field.required}
          aria-describedby={describedBy}
          className={cn(
            "text-base",
            hasError && "border-destructive focus-visible:ring-destructive"
          )}
        >
          <SelectValue placeholder={field.placeholder ?? "Select an option"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
}

