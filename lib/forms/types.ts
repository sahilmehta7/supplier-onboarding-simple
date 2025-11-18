/**
 * Shared type definitions for dynamic form rendering system
 * Used across all implementation streams
 */

import type {
  DocumentType,
  FormConfig,
  FormDocumentRequirement,
  FormField,
  FormSection,
  Entity,
  Geography,
} from "@prisma/client";

/**
 * Form configuration with nested sections and fields
 */
export type FormConfigWithFields = FormConfig & {
  sections: (FormSection & { fields: FormField[] })[];
  documentRules: (FormDocumentRequirement & { documentType: DocumentType })[];
  entity: Entity;
  geography: Geography;
};

/**
 * Field rendering configuration
 */
export interface FieldRenderConfig {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: { values: string[] };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  visibility?: {
    dependsOn: string;
    condition:
      | "equals"
      | "notEquals"
      | "contains"
      | "greaterThan"
      | "lessThan"
      | "isEmpty"
      | "isNotEmpty";
    value: unknown;
  };
  isSensitive: boolean;
}

/**
 * Form wizard state
 */
export interface FormWizardState {
  currentStep: number;
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Set<string>;
  completedSteps: Set<number>;
  isDirty: boolean;
  isSubmitting: boolean;
}

/**
 * Visibility rule for conditional fields
 */
export interface VisibilityRule {
  dependsOn: string; // Field key
  condition:
    | "equals"
    | "notEquals"
    | "contains"
    | "greaterThan"
    | "lessThan"
    | "isEmpty"
    | "isNotEmpty";
  value: unknown;
}

