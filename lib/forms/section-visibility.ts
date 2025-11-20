import type { FormSection } from "@prisma/client";

import type { VisibilityConfig } from "@/lib/forms/types";
import {
  evaluateVisibilityRule,
  normalizeVisibilityConfig,
} from "@/lib/forms/visibility-engine";

export function getSectionVisibilityConfig(
  section: FormSection
): VisibilityConfig | null {
  return normalizeVisibilityConfig(section.visibility ?? null);
}

export function shouldSectionBeVisible(
  section: FormSection,
  formData: Record<string, unknown>
): boolean {
  const config = getSectionVisibilityConfig(section);
  if (!config) {
    return true;
  }

  if (config.match === "any") {
    return config.rules.some((rule) => evaluateVisibilityRule(rule, formData));
  }

  return config.rules.every((rule) => evaluateVisibilityRule(rule, formData));
}

export function getSectionVisibilityState(
  sections: FormSection[],
  formData: Record<string, unknown>
): Record<string, boolean> {
  return sections.reduce<Record<string, boolean>>((state, section) => {
    state[section.id] = shouldSectionBeVisible(section, formData);
    return state;
  }, {});
}

