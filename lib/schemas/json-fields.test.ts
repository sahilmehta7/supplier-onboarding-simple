import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
    FormDataSchema,
    ValidationRulesSchema,
    FieldOptionsSchema,
    VisibilityConfigSchema,
    parseJsonField,
} from "./json-fields";

describe("FormDataSchema", () => {
    it("should validate valid form data", () => {
        const data = {
            name: "John Doe",
            age: 30,
            active: true,
            tags: ["developer", "designer"],
            metadata: { role: "admin" },
        };

        expect(() => FormDataSchema.parse(data)).not.toThrow();
    });

    it("should reject invalid form data", () => {
        const data = {
            name: "John",
            invalid: Symbol("test"), // Invalid type
        };

        expect(() => FormDataSchema.parse(data)).toThrow();
    });
});

describe("ValidationRulesSchema", () => {
    it("should validate email rule", () => {
        const rules = {
            email: true,
            customMessage: "Invalid email format",
        };

        expect(() => ValidationRulesSchema.parse(rules)).not.toThrow();
    });

    it("should validate regex pattern rule", () => {
        const rules = {
            pattern: "^[A-Z]{2}[0-9]{4}$",
            customMessage: "Invalid format",
        };

        expect(() => ValidationRulesSchema.parse(rules)).not.toThrow();
    });

    it("should validate min/max rules", () => {
        const rules = {
            min: 0,
            max: 100,
            customMessage: "Must be between 0 and 100",
        };

        expect(() => ValidationRulesSchema.parse(rules)).not.toThrow();
    });
});

describe("FieldOptionsSchema", () => {
    it("should validate select field options", () => {
        const options = {
            values: ["Option 1", "Option 2", "Option 3"],
        };

        expect(() => FieldOptionsSchema.parse(options)).not.toThrow();
    });

    it("should validate document type options", () => {
        const options = {
            documentTypeKey: "w9",
        };

        expect(() => FieldOptionsSchema.parse(options)).not.toThrow();
    });

    it("should allow empty options", () => {
        const options = {};

        expect(() => FieldOptionsSchema.parse(options)).not.toThrow();
    });
});

describe("VisibilityConfigSchema", () => {
    it("should validate visibility config with all mode", () => {
        const config = {
            mode: "all" as const,
            rules: [
                { field: "country", operator: "eq" as const, value: "US" },
                { field: "status", operator: "neq" as const, value: "draft" },
            ],
        };

        expect(() => VisibilityConfigSchema.parse(config)).not.toThrow();
    });

    it("should validate visibility config with any mode", () => {
        const config = {
            mode: "any" as const,
            rules: [
                { field: "isActive", operator: "eq" as const, value: true },
                { field: "email", operator: "notEmpty" as const },
            ],
        };

        expect(() => VisibilityConfigSchema.parse(config)).not.toThrow();
    });

    it("should reject invalid operator", () => {
        const config = {
            mode: "all",
            rules: [{ field: "test", operator: "invalid", value: "test" }],
        };

        expect(() => VisibilityConfigSchema.parse(config)).toThrow();
    });
});

describe("parseJsonField", () => {
    it("should parse valid JSON", () => {
        const schema = z.object({ name: z.string() });
        const data = { name: "John" };
        const defaultValue = { name: "Default" };

        const result = parseJsonField(data, schema, defaultValue);

        expect(result).toEqual({ name: "John" });
    });

    it("should return default on invalid JSON", () => {
        const schema = z.object({ name: z.string() });
        const data = { name: 123 }; // Invalid: should be string
        const defaultValue = { name: "Default" };

        const result = parseJsonField(data, schema, defaultValue);

        expect(result).toEqual({ name: "Default" });
    });

    it("should return default on null", () => {
        const schema = z.object({ name: z.string() });
        const defaultValue = { name: "Default" };

        const result = parseJsonField(null, schema, defaultValue);

        expect(result).toEqual({ name: "Default" });
    });
});
