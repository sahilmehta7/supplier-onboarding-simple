"use client";

import * as React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
 * Radio group field component using shadcn RadioGroup
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
      <div onBlur={onBlur}>
        <RadioGroup
          value={value ?? ""}
          onValueChange={onChange}
          disabled={disabled}
          aria-labelledby={`${fieldId}-label`}
          aria-describedby={describedBy}
          aria-invalid={hasError}
          aria-required={field.required}
          className={cn(hasError && "[&>div]:border-destructive")}
        >
          {options.map((option) => {
            const optionId = `${fieldId}-${option}`;
            return (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option}
                  id={optionId}
                  aria-describedby={describedBy}
                />
                <Label
                  htmlFor={optionId}
                  className="text-sm font-normal leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    </FieldWrapper>
  );
}

