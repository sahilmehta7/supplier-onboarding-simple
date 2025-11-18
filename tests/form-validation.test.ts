import { describe, it, expect } from "vitest";
import { buildFormSchema } from "@/lib/form-schema";
import {
  validateField,
  validateStep,
  validateForm,
  isStepComplete,
} from "@/lib/forms/form-validator";
import type { FormConfigWithFields } from "@/lib/form-schema";

const configWithValidation: FormConfigWithFields = {
  id: "config-1",
  entityId: "entity-1",
  geographyId: "geo-1",
  version: 1,
  isActive: true,
  title: "Test Form",
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
      key: "section1",
      label: "Section 1",
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: [
        {
          id: "field-1",
          sectionId: "section-1",
          key: "name",
          label: "Name",
          type: "text",
          placeholder: null,
          helpText: null,
          required: true,
          options: null,
          validation: {
            minLength: 3,
            maxLength: 50,
          },
          visibility: null,
          order: 1,
          isSensitive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "field-2",
          sectionId: "section-1",
          key: "age",
          label: "Age",
          type: "number",
          placeholder: null,
          helpText: null,
          required: true,
          options: null,
          validation: {
            min: 18,
            max: 100,
          },
          visibility: null,
          order: 2,
          isSensitive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "field-3",
          sectionId: "section-1",
          key: "email",
          label: "Email",
          type: "email",
          placeholder: null,
          helpText: null,
          required: false,
          options: null,
          validation: {
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          },
          visibility: null,
          order: 3,
          isSensitive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    {
      id: "section-2",
      formConfigId: "config-1",
      key: "section2",
      label: "Section 2",
      order: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: [
        {
          id: "field-4",
          sectionId: "section-2",
          key: "optional_field",
          label: "Optional Field",
          type: "text",
          placeholder: null,
          helpText: null,
          required: false,
          options: null,
          validation: null,
          visibility: null,
          order: 1,
          isSensitive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
  ],
} as const;

describe("form validation", () => {
  describe("buildFormSchema with validation rules", () => {
    it("applies minLength and maxLength validation", () => {
      const schema = buildFormSchema(configWithValidation);
      
      // Valid
      expect(() =>
        schema.parse({ name: "John Doe", age: 25 })
      ).not.toThrow();
      
      // Too short
      expect(() => schema.parse({ name: "Jo", age: 25 })).toThrow();
      
      // Too long
      expect(() =>
        schema.parse({
          name: "A".repeat(51),
          age: 25,
        })
      ).toThrow();
    });

    it("applies min and max validation for numbers", () => {
      const schema = buildFormSchema(configWithValidation);
      
      // Valid
      expect(() => schema.parse({ name: "John", age: 25 })).not.toThrow();
      
      // Too small
      expect(() => schema.parse({ name: "John", age: 17 })).toThrow();
      
      // Too large
      expect(() => schema.parse({ name: "John", age: 101 })).toThrow();
    });

    it("applies pattern validation", () => {
      const schema = buildFormSchema(configWithValidation);
      
      // Valid email
      expect(() =>
        schema.parse({ name: "John", age: 25, email: "test@example.com" })
      ).not.toThrow();
      
      // Invalid email
      expect(() =>
        schema.parse({ name: "John", age: 25, email: "invalid-email" })
      ).toThrow();
    });
  });

  describe("validateField", () => {
    it("validates a single field", () => {
      const schema = buildFormSchema(configWithValidation);
      const nameSchema = schema.shape.name;

      const result1 = validateField("name", "John Doe", nameSchema);
      expect(result1.isValid).toBe(true);

      const result2 = validateField("name", "Jo", nameSchema);
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBeDefined();
    });
  });

  describe("validateStep", () => {
    it("validates all fields in a step", () => {
      const validData = {
        name: "John Doe",
        age: 25,
        email: "test@example.com",
      };

      const result = validateStep(0, validData, configWithValidation);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("returns errors for invalid step data", () => {
      const invalidData = {
        name: "Jo", // Too short
        age: 17, // Too small
        email: "invalid",
      };

      const result = validateStep(0, invalidData, configWithValidation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty("name");
      expect(result.errors).toHaveProperty("age");
      expect(result.firstErrorField).toBeDefined();
    });

    it("validates required fields", () => {
      const missingData = {
        // Missing required fields
      };

      const result = validateStep(0, missingData, configWithValidation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty("name");
      expect(result.errors).toHaveProperty("age");
    });

    it("skips hidden fields when validating a step", () => {
      const partialData = {
        name: "Evelyn Supplier",
      };

      const result = validateStep(0, partialData, configWithValidation, {
        visibilityMap: {
          name: true,
          age: false,
        },
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).not.toHaveProperty("age");
    });
  });

  describe("validateForm", () => {
    it("validates entire form", () => {
      const validData = {
        name: "John Doe",
        age: 25,
        email: "test@example.com",
        optional_field: "value",
      };

      const result = validateForm(validData, configWithValidation);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("returns errors for invalid form data", () => {
      const invalidData = {
        name: "Jo",
        age: 17,
        email: "invalid",
      };

      const result = validateForm(invalidData, configWithValidation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty("name");
      expect(result.errors).toHaveProperty("age");
      expect(result.stepErrors).toHaveProperty("0");
    });
  });

  describe("isStepComplete", () => {
    it("returns true for complete step", () => {
      const validData = {
        name: "John Doe",
        age: 25,
        email: "test@example.com",
      };

      expect(isStepComplete(0, validData, configWithValidation)).toBe(true);
    });

    it("returns false for incomplete step", () => {
      const invalidData = {
        name: "Jo",
        age: 17,
      };

      expect(isStepComplete(0, invalidData, configWithValidation)).toBe(false);
    });
  });
});

