import { describe, expect, it } from "vitest";
import type { FormSection } from "@prisma/client";

import {
  getSectionVisibilityState,
  shouldSectionBeVisible,
} from "@/lib/forms/section-visibility";

function buildSection(
  overrides: Partial<FormSection> = {}
): FormSection {
  const base: FormSection = {
    id: "section-id",
    formConfigId: "form-config",
    key: "section_key",
    label: "Section Label",
    order: 0,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    visibility: null,
  };

  return {
    ...base,
    ...overrides,
  };
}

describe("section-visibility", () => {
  it("returns true when no visibility configuration is set", () => {
    const section = buildSection();
    const result = shouldSectionBeVisible(section, { any_field: "value" });
    expect(result).toBe(true);
  });

  it("evaluates match-all rules correctly", () => {
    const section = buildSection({
      visibility: {
        match: "all",
        rules: [
          { dependsOn: "entity_type", condition: "equals", value: "vendor" },
          { dependsOn: "country", condition: "equals", value: "us" },
        ],
      },
    });

    expect(
      shouldSectionBeVisible(section, {
        entity_type: "vendor",
        country: "us",
      })
    ).toBe(true);

    expect(
      shouldSectionBeVisible(section, {
        entity_type: "vendor",
        country: "ca",
      })
    ).toBe(false);
  });

  it("evaluates match-any rules correctly", () => {
    const section = buildSection({
      visibility: {
        match: "any",
        rules: [
          { dependsOn: "region", condition: "equals", value: "emea" },
          { dependsOn: "region", condition: "equals", value: "apac" },
        ],
      },
    });

    expect(
      shouldSectionBeVisible(section, {
        region: "emea",
      })
    ).toBe(true);

    expect(
      shouldSectionBeVisible(section, {
        region: "latam",
      })
    ).toBe(false);
  });

  it("builds visibility state for multiple sections", () => {
    const sections = [
      buildSection({
        id: "tax",
        key: "tax",
        visibility: {
          match: "all",
          rules: [{ dependsOn: "requires_tax", condition: "equals", value: true }],
        },
      }),
      buildSection({
        id: "banking",
        key: "banking",
        visibility: null,
      }),
    ];

    const state = getSectionVisibilityState(sections, {
      requires_tax: false,
    });

    expect(state).toEqual({
      tax: false,
      banking: true,
    });
  });
});

