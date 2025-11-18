import { describe, it, expect } from "vitest";
import { buildFormSchema, describeFormSchema } from "@/lib/form-schema";

const config = {
  id: "config-1",
  entityId: "entity-1",
  geographyId: "geo-1",
  version: 1,
  isActive: true,
  title: "Example",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  formConfigId: undefined,
  formConfig: undefined,
  applications: [],
  documentRules: [],
  sections: [
    {
      id: "section-1",
      formConfigId: "config-1",
      key: "supplier_info",
      label: "Supplier Info",
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: [
        {
          id: "field-1",
          sectionId: "section-1",
          key: "supplier_name",
          label: "Supplier Name",
          type: "text",
          placeholder: null,
          helpText: null,
          required: true,
          options: null,
          validation: null,
          visibility: null,
          order: 1,
          isSensitive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "field-2",
          sectionId: "section-1",
          key: "payment_terms",
          label: "Payment Terms",
          type: "select",
          placeholder: null,
          helpText: null,
          required: false,
          options: { values: ["Net 30", "Net 60"] },
          validation: null,
          visibility: null,
          order: 2,
          isSensitive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
  ],
} as const;

describe("form schema generator", () => {
  it("generates a valid Zod schema", () => {
    const schema = buildFormSchema(config);
    expect(() =>
      schema.parse({ supplier_name: "Acme", payment_terms: "Net 30" })
    ).not.toThrow();
  });

  it("describes schema for preview", () => {
    const descriptor = describeFormSchema(config);
    expect(descriptor).toHaveLength(2);
    expect(descriptor[0]).toMatchObject({ key: "supplier_name", required: true });
  });
});
