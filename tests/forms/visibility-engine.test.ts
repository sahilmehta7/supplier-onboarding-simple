import { describe, expect, it } from "vitest";

import {
  evaluateVisibilityRule,
  getFieldVisibilityDependencies,
  shouldFieldBeVisible,
} from "@/lib/forms/visibility-engine";
import type { VisibilityRule } from "@/lib/forms/types";
import { createVisibilityField } from "@/tests/fixtures/forms/factories";

describe("visibility-engine", () => {
  const formData = {
    country: "US",
    employees: 150,
    certifications: ["iso9001", "iso27001"],
    description: "",
  };

  describe("evaluateVisibilityRule", () => {
    const baseRule: VisibilityRule = {
      dependsOn: "country",
      condition: "equals",
      value: "US",
    };

    it("evaluates equality based rules", () => {
      expect(evaluateVisibilityRule(baseRule, formData)).toBe(true);
      expect(
        evaluateVisibilityRule(
          { ...baseRule, condition: "notEquals", value: "CA" },
          formData
        )
      ).toBe(true);
    });

    it("evaluates contains for arrays and strings", () => {
      expect(
        evaluateVisibilityRule(
          { dependsOn: "certifications", condition: "contains", value: "iso27001" },
          formData
        )
      ).toBe(true);
      expect(
        evaluateVisibilityRule(
          {
            dependsOn: "country",
            condition: "contains",
            value: "u",
          },
          formData
        )
      ).toBe(true);
    });

    it("evaluates numeric comparisons safely", () => {
      expect(
        evaluateVisibilityRule(
          { dependsOn: "employees", condition: "greaterThan", value: 100 },
          formData
        )
      ).toBe(true);
      expect(
        evaluateVisibilityRule(
          { dependsOn: "employees", condition: "lessThan", value: 120 },
          formData
        )
      ).toBe(false);
    });

    it("treats empty checks properly", () => {
      expect(
        evaluateVisibilityRule(
          { dependsOn: "description", condition: "isEmpty", value: null },
          formData
        )
      ).toBe(true);
      expect(
        evaluateVisibilityRule(
          { dependsOn: "description", condition: "isNotEmpty", value: null },
          formData
        )
      ).toBe(false);
    });
  });

  describe("shouldFieldBeVisible", () => {
    it("returns true when no visibility config is provided", () => {
      const field = createVisibilityField(null);
      expect(shouldFieldBeVisible(field, formData)).toBe(true);
    });

    it("supports array shorthand configs (match all)", () => {
      const field = createVisibilityField([
        { dependsOn: "country", condition: "equals", value: "US" },
        { dependsOn: "employees", condition: "greaterThan", value: 100 },
      ]);

      expect(shouldFieldBeVisible(field, formData)).toBe(true);

      const failingData = { ...formData, employees: 50 };
      expect(shouldFieldBeVisible(field, failingData)).toBe(false);
    });

    it("supports match:any configs with object shape", () => {
      const field = createVisibilityField({
        match: "any",
        rules: [
          { dependsOn: "country", condition: "equals", value: "CA" },
          { dependsOn: "employees", condition: "greaterThan", value: 120 },
        ],
      });

      expect(shouldFieldBeVisible(field, formData)).toBe(true);
    });

    it("parses JSON string configs", () => {
      const field = createVisibilityField(
        JSON.stringify({
          match: "all",
          rules: [{ dependsOn: "country", condition: "equals", value: "US" }],
        })
      );

      expect(shouldFieldBeVisible(field, formData)).toBe(true);
    });
  });

  describe("getFieldVisibilityDependencies", () => {
    it("returns the set of dependency keys derived from rules", () => {
      const field = createVisibilityField({
        rules: [
          { dependsOn: "country", condition: "equals", value: "US" },
          { dependsOn: "employees", condition: "greaterThan", value: 100 },
          { dependsOn: "country", condition: "notEquals", value: "MX" },
        ],
      });

      expect(getFieldVisibilityDependencies(field)).toEqual([
        "country",
        "employees",
      ]);
    });

    it("returns an empty array when no visibility data exists", () => {
      const field = createVisibilityField(null);
      expect(getFieldVisibilityDependencies(field)).toEqual([]);
    });
  });
});


