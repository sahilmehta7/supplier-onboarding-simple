"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { FieldWrapper } from "./field-wrapper";
import { cn } from "@/lib/utils";
import type { FormField } from "@prisma/client";

interface FieldInputRadioProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
}

/**
 * Radio group field component
 */
export function FieldInputRadio({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  touched = true,
}: FieldInputRadioProps) {
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
      <div
        className="space-y-2"
        role="radiogroup"
        aria-labelledby={`${fieldId}-label`}
        aria-describedby={describedBy}
        aria-invalid={hasError}
        aria-required={field.required}
      >
        {options.map((option) => {
          const optionId = `${fieldId}-${option}`;
          const isChecked = value === option;
          return (
            <div key={option} className="flex items-center space-x-2">
              <input
                id={optionId}
                type="radio"
                name={fieldId}
                value={option}
                checked={isChecked}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                disabled={disabled}
                required={field.required}
                aria-describedby={describedBy}
                className={cn(
                  "h-4 w-4 border border-input shadow-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  hasError && "border-destructive",
                  "checked:bg-primary checked:border-primary"
                )}
              />
              <label
                htmlFor={optionId}
                className={cn(
                  "text-sm font-normal leading-none cursor-pointer",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                )}
              >
                {option}
              </label>
            </div>
          );
        })}
      </div>
    </FieldWrapper>
  );
}

