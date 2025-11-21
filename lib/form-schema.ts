import { z } from "zod";
import type { FormField } from "@prisma/client";
import type { FormConfigWithFields } from "@/lib/forms/types";
export type { FormConfigWithFields } from "@/lib/forms/types";

/**
 * Validation rules structure from FormField.validation JSON
 */
interface ValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  customMessage?: string;
}

const selectValues = (options?: unknown) => {
  if (!options || typeof options !== "object") return [];
  if ("values" in (options as Record<string, unknown>)) {
    const values = (options as Record<string, unknown>).values;
    if (Array.isArray(values)) {
      return values.filter(
        (value): value is string => typeof value === "string"
      );
    }
  }
  return [];
};

/**
 * Parse validation rules from FormField.validation JSON
 */
function parseValidationRules(field: FormField): ValidationRules | null {
  if (!field.validation || typeof field.validation !== "object") {
    return null;
  }
  const validation = field.validation as Record<string, unknown>;
  return {
    min: typeof validation.min === "number" ? validation.min : undefined,
    max: typeof validation.max === "number" ? validation.max : undefined,
    pattern: typeof validation.pattern === "string" ? validation.pattern : undefined,
    minLength: typeof validation.minLength === "number" ? validation.minLength : undefined,
    maxLength: typeof validation.maxLength === "number" ? validation.maxLength : undefined,
    customMessage: typeof validation.customMessage === "string" ? validation.customMessage : undefined,
  };
}

/**
 * Apply validation rules to a Zod schema based on field type
 */
function applyValidationRules(
  schema: z.ZodTypeAny,
  field: FormField,
  rules: ValidationRules
): z.ZodTypeAny {
  let validatedSchema = schema;

  // Apply type-specific validations
  if (field.type === "number") {
    if (rules.min !== undefined) {
      validatedSchema = (validatedSchema as z.ZodNumber).min(
        rules.min,
        rules.customMessage || `${field.label} must be at least ${rules.min}`
      );
    }
    if (rules.max !== undefined) {
      validatedSchema = (validatedSchema as z.ZodNumber).max(
        rules.max,
        rules.customMessage || `${field.label} must be at most ${rules.max}`
      );
    }
  } else if (field.type === "text" || field.type === "email" || field.type === "tel" || field.type === "textarea") {
    // String validations
    if (rules.minLength !== undefined) {
      validatedSchema = (validatedSchema as z.ZodString).min(
        rules.minLength,
        rules.customMessage || `${field.label} must be at least ${rules.minLength} characters`
      );
    }
    if (rules.maxLength !== undefined) {
      validatedSchema = (validatedSchema as z.ZodString).max(
        rules.maxLength,
        rules.customMessage || `${field.label} must be at most ${rules.maxLength} characters`
      );
    }
    if (rules.pattern) {
      try {
        const regex = new RegExp(rules.pattern);
        validatedSchema = (validatedSchema as z.ZodString).regex(
          regex,
          rules.customMessage || `${field.label} format is invalid`
        );
      } catch (error) {
        // Invalid regex pattern, skip pattern validation
        console.warn(`Invalid regex pattern for field ${field.key}: ${rules.pattern}`);
      }
    }
  }

  return validatedSchema;
}

const DOCUMENT_VALUE_SCHEMA = z.object({
  fileId: z.string(),
  fileName: z.string(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  documentTypeKey: z.string().optional(),
  uploadedAt: z
    .string()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Invalid upload timestamp",
    })
    .optional(),
});

function fieldToSchema(field: FormField) {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "number":
      schema = z.number();
      break;
    case "select":
    case "radio":
      const values = selectValues(field.options ?? undefined);
      schema = values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string();
      break;
    case "boolean":
    case "checkbox":
      schema = z.boolean();
      break;
    case "multi-select":
      let arraySchema = z.array(z.string());
      if (field.required) {
        arraySchema = arraySchema.min(1, `${field.label} must include at least one selection`);
      }
      schema = arraySchema;
      break;
    case "date":
      schema = z.string().refine((value) => !isNaN(Date.parse(value)), {
        message: "Invalid date",
      });
      break;
    case "document":
      schema = DOCUMENT_VALUE_SCHEMA.refine(
        (value) => {
          if (!value) return !field.required;
          return (
            typeof value === "object" &&
            typeof value.fileId === "string" &&
            value.fileId.length > 0 &&
            typeof value.fileName === "string" &&
            value.fileName.length > 0
          );
        },
        {
          message: field.required
            ? `${field.label} is required`
            : `${field.label} must be a valid document`,
        }
      );
      break;
    case "email":
      schema = z.string().email(`${field.label} must be a valid email address`);
      break;
    case "tel":
      schema = z
        .string()
        .regex(/^[\d\-\s()+.]+$/, `${field.label} must be a valid phone number`);
      break;
    default:
      schema = z.string();
  }

  // Apply custom validation rules
  const validationRules = parseValidationRules(field);
  if (validationRules) {
    schema = applyValidationRules(schema, field, validationRules);
  }

  // Handle required/optional
  if (field.required) {
    return schema;
  }
  return schema.optional();
}

import { VALIDATOR_REGISTRY } from "@/lib/validators/registry";

// ... (existing imports)

export function buildFormSchema(config: FormConfigWithFields) {
  const fields: Record<string, z.ZodTypeAny> = {};
  const externalValidators: Array<{
    key: string;
    validator: string;
    params: Record<string, unknown>;
  }> = [];

  config.sections.forEach((section) => {
    section.fields.forEach((field) => {
      fields[field.key] = fieldToSchema(field).describe(field.label);

      if (field.externalValidator && VALIDATOR_REGISTRY[field.externalValidator]) {
        externalValidators.push({
          key: field.key,
          validator: field.externalValidator,
          params: (field.validatorParams as Record<string, unknown>) || {},
        });
      }
    });
  });

  let schema = z.object(fields);

  if (externalValidators.length > 0) {
    schema = schema.superRefine(async (data, ctx) => {
      await Promise.all(
        externalValidators.map(async ({ key, validator, params }) => {
          const value = data[key];
          const validatorFn = VALIDATOR_REGISTRY[validator];

          if (!validatorFn) return;

          try {
            const result = await validatorFn(value, data, params);
            if (result !== true) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: typeof result === "string" ? result : "Validation failed",
                path: [key],
              });
            }
          } catch (error) {
            console.error(`Validator ${validator} failed for field ${key}:`, error);
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Validation error occurred",
              path: [key],
            });
          }
        })
      );
    }) as unknown as z.ZodObject<any>;
  }

  return schema;
}

export function describeFormSchema(config: FormConfigWithFields) {
  return config.sections.flatMap((section) =>
    section.fields.map((field) => ({
      section: section.label,
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
    }))
  );
}

