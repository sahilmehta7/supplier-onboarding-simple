import { DynamicFormWizard } from "@/components/forms/dynamic-form-wizard";
import type { FormConfigWithFields } from "@/lib/forms/types";
import { notFound } from "next/navigation";

const staticDate = new Date("2025-01-01T00:00:00.000Z");

const mockFormConfig = {
  id: "preview-form-config",
  entityId: "preview-entity",
  geographyId: "preview-geo",
  version: 1,
  isActive: true,
  title: "Preview Supplier Onboarding",
  description: "Dev-only route for responsive & accessibility verification.",
  createdAt: staticDate,
  updatedAt: staticDate,
  entity: {
    id: "preview-entity",
    name: "Preview Entity",
    code: "PRV",
    description: "Used only for local QA.",
    createdAt: staticDate,
    updatedAt: staticDate,
  },
  geography: {
    id: "preview-geo",
    code: "GLB",
    name: "Global",
    createdAt: staticDate,
    updatedAt: staticDate,
  },
  sections: [
    {
      id: "preview-section-1",
      formConfigId: "preview-form-config",
      key: "business_profile",
      label: "Business Profile",
      order: 1,
      createdAt: staticDate,
      updatedAt: staticDate,
      fields: [
        {
          id: "field-supplier-name",
          sectionId: "preview-section-1",
          key: "supplier_name",
          label: "Supplier Name",
          type: "text",
          placeholder: "Acme Corporation",
          helpText: "Enter the legal entity name.",
          required: true,
          options: null,
          validation: { minLength: 3, maxLength: 80 },
          visibility: null,
          order: 1,
          isSensitive: false,
          createdAt: staticDate,
          updatedAt: staticDate,
        },
        {
          id: "field-company-email",
          sectionId: "preview-section-1",
          key: "company_email",
          label: "Company Email",
          type: "email",
          placeholder: "ops@acme.com",
          helpText: "We'll use this for all status updates.",
          required: true,
          options: null,
          validation: null,
          visibility: null,
          order: 2,
          isSensitive: false,
          createdAt: staticDate,
          updatedAt: staticDate,
        },
        {
          id: "field-preferred-terms",
          sectionId: "preview-section-1",
          key: "preferred_terms",
          label: "Preferred Payment Terms",
          type: "select",
          placeholder: null,
          helpText: "Select the closest option.",
          required: true,
          options: { values: ["Net 15", "Net 30", "Net 45", "Net 60"] },
          validation: null,
          visibility: null,
          order: 3,
          isSensitive: false,
          createdAt: staticDate,
          updatedAt: staticDate,
        },
      ],
    },
    {
      id: "preview-section-2",
      formConfigId: "preview-form-config",
      key: "banking",
      label: "Banking Details",
      order: 2,
      createdAt: staticDate,
      updatedAt: staticDate,
      fields: [
        {
          id: "field-routing-number",
          sectionId: "preview-section-2",
          key: "routing_number",
          label: "Routing Number",
          type: "text",
          placeholder: "#########",
          helpText: "9 digits, US banks only.",
          required: true,
          options: null,
          validation: { minLength: 9, maxLength: 9 },
          visibility: {
            dependsOn: "preferred_terms",
            condition: "notEquals",
            value: "Net 15",
          },
          order: 1,
          isSensitive: true,
          createdAt: staticDate,
          updatedAt: staticDate,
        },
        {
          id: "field-swift-code",
          sectionId: "preview-section-2",
          key: "swift_code",
          label: "SWIFT Code",
          type: "text",
          placeholder: "ACMEUS33",
          helpText: "Shown when payment terms require international wires.",
          required: false,
          options: null,
          validation: null,
          visibility: {
            dependsOn: "preferred_terms",
            condition: "equals",
            value: "Net 60",
          },
          order: 2,
          isSensitive: true,
          createdAt: staticDate,
          updatedAt: staticDate,
        },
        {
          id: "field-support-notes",
          sectionId: "preview-section-2",
          key: "supporting_notes",
          label: "Supporting Notes",
          type: "textarea",
          placeholder: "Anything else we should know?",
          helpText: "Optional context helps reviewers process faster.",
          required: false,
          options: null,
          validation: { maxLength: 500 },
          visibility: null,
          order: 3,
          isSensitive: false,
          createdAt: staticDate,
          updatedAt: staticDate,
        },
      ],
    },
  ],
  documentRules: [
    {
      id: "doc-rule-w9",
      formConfigId: "preview-form-config",
      documentTypeId: "doc-w9",
      required: true,
      helpText: "Upload a signed PDF. 10MB max.",
      documentType: {
        id: "doc-w9",
        key: "w9",
        label: "W-9 Form",
        category: "tax",
        description: "Standard IRS W-9 form.",
        createdAt: staticDate,
        updatedAt: staticDate,
      },
    },
  ],
} satisfies FormConfigWithFields;

const previewInitialData = {
  supplier_name: "Acme Demo LLC",
  preferred_terms: "Net 45",
  company_email: "ops@example.com",
};

export default function WizardPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 dark:bg-slate-900/60">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Dev Preview · Not for production
          </p>
          <h1 className="text-3xl font-semibold">Dynamic Form Wizard Preview</h1>
          <p className="text-base text-muted-foreground">
            Use this route to manually verify responsive layouts, focus management, and screen
            reader semantics without authenticating.
          </p>
        </header>
        <DynamicFormWizard
          formConfig={mockFormConfig}
          organizationId="preview-organization"
          initialData={previewInitialData}
          initialStep={0}
          applicationId={null}
        />
      </div>
    </div>
  );
}

