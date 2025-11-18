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

interface FieldInputMultiSelectProps {
  field: FormField;
  value: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
}

/**
 * Multi-select field component
 * Note: This is a simplified implementation using Select.
 * For production, consider using a dedicated multi-select component like Combobox.
 */
export function FieldInputMultiSelect({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  touched = true,
}: FieldInputMultiSelectProps) {
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

  const selectedValues = Array.isArray(value) ? value : [];
  const displayValue =
    selectedValues.length > 0
      ? `${selectedValues.length} selected`
      : field.placeholder ?? "Select options";

  const handleValueChange = (newValue: string) => {
    const currentValues = Array.isArray(value) ? [...value] : [];
    if (currentValues.includes(newValue)) {
      // Remove if already selected
      onChange(currentValues.filter((v) => v !== newValue));
    } else {
      // Add if not selected
      onChange([...currentValues, newValue]);
    }
  };

  return (
    <FieldWrapper field={field} error={error} touched={touched}>
      <div className="space-y-2">
        <Select
          value=""
          onValueChange={handleValueChange}
          disabled={disabled}
        >
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
            <SelectValue placeholder={displayValue} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option}
                value={option}
                className={cn(
                  selectedValues.includes(option) && "bg-accent"
                )}
              >
                {option}
                {selectedValues.includes(option) && " ✓"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedValues.map((val) => (
              <span
                key={val}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
              >
                {val}
                <button
                  type="button"
                  onClick={() => {
                    const newValues = selectedValues.filter((v) => v !== val);
                    onChange(newValues);
                  }}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${val}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}

