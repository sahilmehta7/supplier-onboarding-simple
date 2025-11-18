"use client";

import * as React from "react";
import type { FormField } from "@prisma/client";
import { FieldInputText } from "./field-input-text";
import { FieldInputEmail } from "./field-input-email";
import { FieldInputNumber } from "./field-input-number";
import { FieldInputTel } from "./field-input-tel";
import { FieldTextarea } from "./field-textarea";
import { FieldInputSelect } from "./field-input-select";
import { FieldInputMultiSelect } from "./field-input-multi-select";
import { FieldInputCheckbox } from "./field-input-checkbox";
import { FieldInputRadio } from "./field-input-radio";
import { FieldInputDate } from "./field-input-date";
import { FieldDocumentUpload, type DocumentFieldValue } from "./field-document-upload";

interface FormFieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
  isVisible?: boolean;
  applicationId?: string | null;
}

/**
 * Main field renderer component that switches on field type
 * to render the appropriate field component.
 */
export function FormFieldRenderer({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  touched = true,
  isVisible = true,
  applicationId = null,
}: FormFieldRendererProps) {
  if (!isVisible) {
    return null;
  }

  // Handle different field types
  switch (field.type) {
    case "text":
      return (
        <FieldInputText
          field={field}
          value={value as string}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "email":
      return (
        <FieldInputEmail
          field={field}
          value={value as string}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "number":
      return (
        <FieldInputNumber
          field={field}
          value={value as number | string}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "tel":
      return (
        <FieldInputTel
          field={field}
          value={value as string}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "textarea":
      return (
        <FieldTextarea
          field={field}
          value={value as string}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "select":
      return (
        <FieldInputSelect
          field={field}
          value={value as string}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "multi-select":
      return (
        <FieldInputMultiSelect
          field={field}
          value={value as string[]}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "checkbox":
    case "boolean":
      return (
        <FieldInputCheckbox
          field={field}
          value={value as boolean}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "radio":
      return (
        <FieldInputRadio
          field={field}
          value={value as string}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "date":
      return (
        <FieldInputDate
          field={field}
          value={value as string}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
        />
      );

    case "document":
      return (
        <FieldDocumentUpload
          field={field}
          value={value as DocumentFieldValue | null}
          onChange={(val) => onChange(val)}
          onBlur={onBlur}
          error={error}
          disabled={disabled}
          touched={touched}
          applicationId={applicationId}
        />
      );

    default:
      console.warn(`Unknown field type: ${field.type}`);
      return (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Unknown field type: {field.type}
        </div>
      );
  }
}

