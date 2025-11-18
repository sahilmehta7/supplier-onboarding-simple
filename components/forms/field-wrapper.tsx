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
 * Wrapper component for form fields that provides consistent styling,
 * label, help text, and error display.
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
    <div
      className={cn(
        "space-y-2 rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm transition-all duration-300 focus-within:border-primary focus-within:shadow-md motion-reduce:transition-none",
        className
      )}
    >
      <Label
        htmlFor={fieldElementId}
        id={`${fieldElementId}-label`}
        className="text-sm font-medium"
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
        <p id={helpTextId} className="text-xs text-muted-foreground">
          {field.helpText}
        </p>
      )}
      <FieldError error={error} touched={touched} id={errorId} />
    </div>
  );
}

