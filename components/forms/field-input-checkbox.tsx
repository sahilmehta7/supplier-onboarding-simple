"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FieldWrapper } from "./field-wrapper";
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
 * Checkbox field component using shadcn Checkbox
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
  const checked = value ?? false;
  const describedBy = [
    hasError ? `${fieldId}-error` : null,
    field.helpText ? `${fieldId}-help` : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <FieldWrapper field={field} error={error} touched={touched}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={fieldId}
          checked={checked}
          onCheckedChange={(checked) => onChange(checked === true)}
          onBlur={onBlur}
          disabled={disabled}
          required={field.required}
          aria-invalid={hasError}
          aria-required={field.required}
          aria-describedby={describedBy}
          className={cn(hasError && "border-destructive")}
        />
        <Label
          htmlFor={fieldId}
          className="text-sm font-medium cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {field.label}
          {field.required && (
            <span className="ml-0.5 text-destructive" aria-label="required">
              *
            </span>
          )}
        </Label>
      </div>
    </FieldWrapper>
  );
}

