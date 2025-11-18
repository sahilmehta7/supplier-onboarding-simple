import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { FormField } from "@prisma/client";
import type { VisibilityRule } from "@/lib/forms/types";
import {
  evaluateVisibilityRule,
  getFieldVisibilityDependencies,
  shouldFieldBeVisible,
} from "@/lib/forms/visibility-engine";
import { getFieldVisibilityState } from "@/hooks/use-field-visibility";

function createField(overrides: Partial<FormField>): FormField {
  return {
    id: overrides.id ?? `field-${overrides.key ?? "default"}`,
    sectionId: overrides.sectionId ?? "section-1",
    key: overrides.key ?? "default",
    label: overrides.label ?? "Field",
    type: overrides.type ?? "text",
    placeholder: overrides.placeholder ?? null,
    helpText: overrides.helpText ?? null,
    required: overrides.required ?? false,
    options: overrides.options ?? null,
    validation: overrides.validation ?? null,
    visibility: overrides.visibility ?? null,
    order: overrides.order ?? 0,
    isSensitive: overrides.isSensitive ?? false,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

describe("visibility rule engine", () => {
  describe("evaluateVisibilityRule", () => {
    it("handles equals condition", () => {
      const rule: VisibilityRule = {
        dependsOn: "payment_method",
        condition: "equals",
        value: "wire",
      };
      expect(
        evaluateVisibilityRule(rule, { payment_method: "wire" })
      ).toBe(true);
      expect(
        evaluateVisibilityRule(rule, { payment_method: "ach" })
      ).toBe(false);
    });

    it("handles notEquals condition", () => {
      const rule: VisibilityRule = {
        dependsOn: "status",
        condition: "notEquals",
        value: "inactive",
      };
      expect(evaluateVisibilityRule(rule, { status: "active" })).toBe(true);
      expect(evaluateVisibilityRule(rule, { status: "inactive" })).toBe(false);
    });

    it("handles contains condition for arrays and strings", () => {
      const arrayRule: VisibilityRule = {
        dependsOn: "regions",
        condition: "contains",
        value: "us",
      };
      expect(
        evaluateVisibilityRule(arrayRule, { regions: ["us", "mx"] })
      ).toBe(true);
      expect(
        evaluateVisibilityRule(arrayRule, { regions: ["ca"] })
      ).toBe(false);

      const stringRule: VisibilityRule = {
        dependsOn: "notes",
        condition: "contains",
        value: "urgent",
      };
      expect(
        evaluateVisibilityRule(stringRule, { notes: "Handle urgent items" })
      ).toBe(true);
      expect(
        evaluateVisibilityRule(stringRule, { notes: "Standard flow" })
      ).toBe(false);
    });

    it("handles greaterThan and lessThan conditions", () => {
      const gtRule: VisibilityRule = {
        dependsOn: "amount",
        condition: "greaterThan",
        value: 5000,
      };
      const ltRule: VisibilityRule = {
        dependsOn: "quantity",
        condition: "lessThan",
        value: 10,
      };
      expect(evaluateVisibilityRule(gtRule, { amount: 6000 })).toBe(true);
      expect(evaluateVisibilityRule(gtRule, { amount: 1000 })).toBe(false);
      expect(evaluateVisibilityRule(ltRule, { quantity: 5 })).toBe(true);
      expect(evaluateVisibilityRule(ltRule, { quantity: 12 })).toBe(false);
    });

    it("handles isEmpty and isNotEmpty conditions", () => {
      const emptyRule: VisibilityRule = {
        dependsOn: "reference",
        condition: "isEmpty",
        value: null,
      };
      const notEmptyRule: VisibilityRule = {
        dependsOn: "reference",
        condition: "isNotEmpty",
        value: null,
      };
      expect(evaluateVisibilityRule(emptyRule, { reference: "" })).toBe(true);
      expect(
        evaluateVisibilityRule(emptyRule, { reference: "ABC123" })
      ).toBe(false);
      expect(
        evaluateVisibilityRule(notEmptyRule, { reference: "ABC123" })
      ).toBe(true);
      expect(evaluateVisibilityRule(notEmptyRule, { reference: "" })).toBe(
        false
      );
    });
  });

  describe("shouldFieldBeVisible", () => {
    it("returns true when no visibility rules exist", () => {
      const field = createField({ key: "bank_name" });
      expect(shouldFieldBeVisible(field, {})).toBe(true);
    });

    it("evaluates single visibility rule", () => {
      const field = createField({
        key: "bank_name",
        visibility: {
          dependsOn: "payment_method",
          condition: "equals",
          value: "wire",
        },
      });
      expect(
        shouldFieldBeVisible(field, { payment_method: "wire" })
      ).toBe(true);
      expect(
        shouldFieldBeVisible(field, { payment_method: "ach" })
      ).toBe(false);
    });

    it("supports multiple rules with match modes", () => {
      const field = createField({
        key: "international_details",
        visibility: {
          match: "any",
          rules: [
            {
              dependsOn: "currency",
              condition: "equals",
              value: "USD",
            },
            {
              dependsOn: "region",
              condition: "equals",
              value: "NA",
            },
          ],
        },
      });
      expect(
        shouldFieldBeVisible(field, { currency: "USD", region: "APAC" })
      ).toBe(true);
      expect(
        shouldFieldBeVisible(field, { currency: "EUR", region: "NA" })
      ).toBe(true);
      expect(
        shouldFieldBeVisible(field, { currency: "EUR", region: "EMEA" })
      ).toBe(false);
    });

    it("parses stringified visibility configuration", () => {
      const field = createField({
        key: "tax_id",
        visibility: JSON.stringify({
          match: "all",
          rules: [
            {
              dependsOn: "country",
              condition: "equals",
              value: "US",
            },
            {
              dependsOn: "entity_type",
              condition: "equals",
              value: "corporation",
            },
          ],
        }),
      });
      expect(
        shouldFieldBeVisible(field, {
          country: "US",
          entity_type: "corporation",
        })
      ).toBe(true);
      expect(
        shouldFieldBeVisible(field, {
          country: "US",
          entity_type: "individual",
        })
      ).toBe(false);
    });
  });

  describe("getFieldVisibilityDependencies", () => {
    it("returns unique dependency keys", () => {
      const field = createField({
        key: "remit_account",
        visibility: {
          match: "all",
          rules: [
            { dependsOn: "payment_method", condition: "equals", value: "wire" },
            { dependsOn: "currency", condition: "equals", value: "USD" },
            { dependsOn: "payment_method", condition: "notEquals", value: "" },
          ],
        },
      });
      expect(getFieldVisibilityDependencies(field)).toEqual([
        "payment_method",
        "currency",
      ]);
    });
  });

  describe("getFieldVisibilityState", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it("handles cascading dependencies", () => {
      const paymentMethod = createField({ key: "payment_method" });
      const bankName = createField({
        key: "bank_name",
        visibility: {
          dependsOn: "payment_method",
          condition: "equals",
          value: "wire",
        },
      });
      const swiftCode = createField({
        key: "swift_code",
        visibility: {
          dependsOn: "bank_name",
          condition: "isNotEmpty",
          value: null,
        },
      });

      const hiddenState = getFieldVisibilityState(
        [paymentMethod, bankName, swiftCode],
        { payment_method: "ach", bank_name: "Chase" }
      );
      expect(hiddenState.bank_name).toBe(false);
      expect(hiddenState.swift_code).toBe(false);

      const visibleState = getFieldVisibilityState(
        [paymentMethod, bankName, swiftCode],
        { payment_method: "wire", bank_name: "Chase" }
      );
      expect(visibleState.bank_name).toBe(true);
      expect(visibleState.swift_code).toBe(true);
    });

    it("detects circular dependencies and hides affected fields", () => {
      const fieldA = createField({
        key: "field_a",
        visibility: {
          dependsOn: "field_b",
          condition: "isNotEmpty",
          value: null,
        },
      });
      const fieldB = createField({
        key: "field_b",
        visibility: {
          dependsOn: "field_a",
          condition: "isNotEmpty",
          value: null,
        },
      });

      const state = getFieldVisibilityState([fieldA, fieldB], {});
      expect(state.field_a).toBe(false);
      expect(state.field_b).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});

