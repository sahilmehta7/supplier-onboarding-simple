/**
 * Form validation utilities for step-level and form-level validation
 */

import { z } from "zod";
import type { FormConfigWithFields } from "@/lib/form-schema";
import { buildFormSchema } from "@/lib/form-schema";

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validation result for a step/section
 */
export interface StepValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  firstErrorField?: string;
}

/**
 * Validation result for entire form
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  stepErrors: Record<number, StepValidationResult>;
}

/**
 * Validate a single field value against its schema
 */
export function validateField(
  fieldKey: string,
  value: unknown,
  schema: z.ZodSchema
): FieldValidationResult {
  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return {
        isValid: false,
        error: firstIssue?.message || "Invalid value",
      };
    }
    return {
      isValid: false,
      error: "Validation failed",
    };
  }
}

/**
 * Validate all fields in a specific step/section
 */
export interface ValidateStepOptions {
  visibilityMap?: Record<string, boolean>;
}

export function validateStep(
  stepIndex: number,
  formData: Record<string, unknown>,
  config: FormConfigWithFields,
  options?: ValidateStepOptions
): StepValidationResult {
  const section = config.sections[stepIndex];
  if (!section) {
    return {
      isValid: true,
      errors: {},
    };
  }

  const fullSchema = buildFormSchema(config);
  const stepFields = section.fields
    .map((field) => field.key)
    .filter((fieldKey) => options?.visibilityMap?.[fieldKey] ?? true);

  if (stepFields.length === 0) {
    return {
      isValid: true,
      errors: {},
    };
  }

  // Extract only fields from this step
  const stepData: Record<string, unknown> = {};
  stepFields.forEach((key) => {
    stepData[key] = formData[key];
  });

  // Create a schema for just this step's fields
  const stepSchemaFields: Record<string, z.ZodTypeAny> = {};
  stepFields.forEach((key) => {
    const fieldSchema = fullSchema.shape[key];
    if (fieldSchema) {
      stepSchemaFields[key] = fieldSchema;
    }
  });

  const stepSchema = z.object(stepSchemaFields);

  try {
    stepSchema.parse(stepData);
    return {
      isValid: true,
      errors: {},
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      let firstErrorField: string | undefined;

      error.issues.forEach((issue) => {
        const fieldKey = issue.path[0] as string;
        if (fieldKey && stepFields.includes(fieldKey)) {
          errors[fieldKey] = issue.message;
          if (!firstErrorField) {
            firstErrorField = fieldKey;
          }
        }
      });

      return {
        isValid: false,
        errors,
        firstErrorField,
      };
    }

    return {
      isValid: false,
      errors: {},
    };
  }
}

/**
 * Validate entire form
 */
export function validateForm(
  formData: Record<string, unknown>,
  config: FormConfigWithFields
): FormValidationResult {
  const schema = buildFormSchema(config);
  const stepErrors: Record<number, StepValidationResult> = {};

  try {
    schema.parse(formData);
    return {
      isValid: true,
      errors: {},
      stepErrors: {},
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};

      error.issues.forEach((issue) => {
        const fieldKey = issue.path[0] as string;
        if (fieldKey) {
          errors[fieldKey] = issue.message;
        }
      });

      // Also validate each step individually
      config.sections.forEach((section, index) => {
        stepErrors[index] = validateStep(index, formData, config);
      });

      return {
        isValid: false,
        errors,
        stepErrors,
      };
    }

    return {
      isValid: false,
      errors: {},
      stepErrors: {},
    };
  }
}

/**
 * Get all field keys for a specific step
 */
export function getStepFieldKeys(
  stepIndex: number,
  config: FormConfigWithFields
): string[] {
  const section = config.sections[stepIndex];
  if (!section) {
    return [];
  }
  return section.fields.map((field) => field.key);
}

/**
 * Check if a step is complete (all required fields filled)
 */
export function isStepComplete(
  stepIndex: number,
  formData: Record<string, unknown>,
  config: FormConfigWithFields
): boolean {
  const section = config.sections[stepIndex];
  if (!section) {
    return true;
  }

  const stepResult = validateStep(stepIndex, formData, config);
  return stepResult.isValid;
}

