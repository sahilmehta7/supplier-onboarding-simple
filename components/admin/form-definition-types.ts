import type { VisibilityConfig } from "@/lib/forms/types";

export interface EntitySummary {
  id: string;
  name: string;
  code: string;
}

export interface GeographySummary {
  id: string;
  name: string;
  code: string;
}

export interface FormFieldSummary {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  placeholder: string | null;
  helpText: string | null;
  options: unknown;
}

export interface FormSectionSummary {
  id: string;
  key: string;
  label: string;
  order: number;
  formConfigId: string;
  visibility: VisibilityConfig | null;
  fields: FormFieldSummary[];
}

export interface DocumentTypeSummary {
  id: string;
  key: string;
  label: string;
  category: string;
}

export interface DocumentRequirementSummary {
  id: string;
  required: boolean;
  helpText: string | null;
  documentType: DocumentTypeSummary;
}

export interface FormDefinitionSummary {
  id: string;
  entity: EntitySummary;
  geography: GeographySummary;
  version: number;
  title: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  sections: FormSectionSummary[];
  documentRules: DocumentRequirementSummary[];
}


