import { z } from "zod";

/**
 * Zod schema for form data values
 * Provides type safety for dynamic form data
 */
export const FormDataValueSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.string()),
    z.record(z.string(), z.unknown()), // For nested objects
]);

/**
 * Form data schema - record of string keys to validated values
 */
export const FormDataSchema = z.record(z.string(), FormDataValueSchema);

export type FormDataValue = z.infer<typeof FormDataValueSchema>;
export type ValidatedFormData = z.infer<typeof FormDataSchema>;

/**
 * Validation rules schema for field validation configuration
 */
export const ValidationRulesSchema = z.object({
    pattern: z.string().optional(),
    customMessage: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    email: z.boolean().optional(),
    url: z.boolean().optional(),
    regex: z.string().optional(),
    message: z.string().optional(),
});

export type ValidationRules = z.infer<typeof ValidationRulesSchema>;

/**
 * Field options schema for select/radio/checkbox fields
 */
export const FieldOptionsSchema = z.object({
    values: z.array(z.string()).optional(),
    documentTypeKey: z.string().optional(),
});

export type FieldOptions = z.infer<typeof FieldOptionsSchema>;

/**
 * Visibility rule schema for conditional field display
 */
export const VisibilityRuleSchema = z.object({
    field: z.string(),
    operator: z.enum(["eq", "neq", "contains", "notContains", "empty", "notEmpty"]),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export const VisibilityConfigSchema = z.object({
    mode: z.enum(["all", "any"]),
    rules: z.array(VisibilityRuleSchema),
});

export type VisibilityRule = z.infer<typeof VisibilityRuleSchema>;
export type VisibilityConfig = z.infer<typeof VisibilityConfigSchema>;

/**
 * External validator params schema
 */
export const ValidatorParamsSchema = z.record(z.string(), z.unknown());

export type ValidatorParams = z.infer<typeof ValidatorParamsSchema>;

/**
 * Helper to safely parse JSON fields from database
 */
export function parseJsonField<T>(
    value: unknown,
    schema: z.ZodSchema<T>,
    defaultValue: T
): T {
    try {
        return schema.parse(value);
    } catch {
        return defaultValue;
    }
}
