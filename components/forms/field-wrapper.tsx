"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { FieldError } from "./field-error";
import { cn } from "@/lib/utils";
import type { FormField } from "@prisma/client";

interface FieldWrapperProps {
  field: FormField;
  error?: string;
  touched?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Minimal wrapper component for form fields with clean styling.
 * No card borders or backgrounds - just label, field, help text, and errors.
 */
export function FieldWrapper({
  field,
  error,
  touched = true,
  children,
  className,
}: FieldWrapperProps) {
  const fieldElementId = `field-${field.id}`;
  const helpTextId = field.helpText ? `${fieldElementId}-help` : undefined;
  const errorId = `${fieldElementId}-error`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={fieldElementId}
        id={`${fieldElementId}-label`}
        className="text-sm font-medium text-foreground"
      >
        {field.label}
        {field.required && (
          <span className="ml-0.5 text-destructive" aria-label="required">
            *
          </span>
        )}
      </Label>
      {children}
      {field.helpText && (
        <p
          id={helpTextId}
          className="text-xs text-muted-foreground mt-1.5 leading-relaxed"
          role="note"
          aria-live="polite"
        >
          {field.helpText}
        </p>
      )}
      <FieldError error={error} touched={touched} id={errorId} />
    </div>
  );
}

