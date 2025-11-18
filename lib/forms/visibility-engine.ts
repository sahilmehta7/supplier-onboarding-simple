/**
 * Visibility rule evaluation utilities for conditional form fields.
 */

import type { FormField } from "@prisma/client";
import type { VisibilityRule } from "@/lib/forms/types";

const SUPPORTED_CONDITIONS: ReadonlyArray<VisibilityRule["condition"]> = [
  "equals",
  "notEquals",
  "contains",
  "greaterThan",
  "lessThan",
  "isEmpty",
  "isNotEmpty",
];

type VisibilityMatchMode = "all" | "any";

interface NormalizedVisibilityConfig {
  match: VisibilityMatchMode;
  rules: VisibilityRule[];
}

function parseJsonIfNeeded(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVisibilityRule(candidate: unknown): candidate is VisibilityRule {
  if (!isPlainObject(candidate)) {
    return false;
  }

  const dependsOn = candidate.dependsOn;
  const condition = candidate.condition;

  if (typeof dependsOn !== "string" || dependsOn.trim().length === 0) {
    return false;
  }

  if (typeof condition !== "string") {
    return false;
  }

  return SUPPORTED_CONDITIONS.includes(condition as VisibilityRule["condition"]);
}

function normalizeRule(candidate: unknown): VisibilityRule | null {
  if (!isVisibilityRule(candidate)) {
    return null;
  }

  return {
    dependsOn: candidate.dependsOn,
    condition: candidate.condition,
    value: candidate.value,
  };
}

function normalizeConfig(raw: unknown): NormalizedVisibilityConfig | null {
  if (!raw) {
    return null;
  }

  const parsed = parseJsonIfNeeded(raw);

  if (Array.isArray(parsed)) {
    const rules = parsed
      .map(normalizeRule)
      .filter((rule): rule is VisibilityRule => Boolean(rule));

    if (rules.length === 0) {
      return null;
    }

    return { match: "all", rules };
  }

  if (isPlainObject(parsed)) {
    if ("rules" in parsed && Array.isArray(parsed.rules)) {
      const match =
        parsed.match === "any" || parsed.match === "all" ? parsed.match : "all";
      const rules = parsed.rules
        .map(normalizeRule)
        .filter((rule): rule is VisibilityRule => Boolean(rule));

      if (rules.length === 0) {
        return null;
      }

      return { match, rules };
    }

    const singleRule = normalizeRule(parsed);
    if (singleRule) {
      return { match: "all", rules: [singleRule] };
    }
  }

  return null;
}

function isValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (value instanceof Date) {
    return false;
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }
  return null;
}

function containsValue(source: unknown, target: unknown): boolean {
  if (Array.isArray(source)) {
    return source.some((item) => item === target);
  }

  if (typeof source === "string") {
    return typeof target === "string"
      ? source.toLowerCase().includes(target.toLowerCase())
      : source.includes(String(target));
  }

  return false;
}

function areValuesEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => areValuesEqual(value, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    return aKeys.every((key) => areValuesEqual(a[key], b[key]));
  }

  return Object.is(a, b);
}

function getFieldVisibilityConfig(
  field: FormField
): NormalizedVisibilityConfig | null {
  return normalizeConfig(field.visibility ?? null);
}

/**
 * Evaluate a single visibility rule against the provided form data.
 */
export function evaluateVisibilityRule(
  rule: VisibilityRule,
  formData: Record<string, unknown>
): boolean {
  const fieldValue = formData[rule.dependsOn];

  switch (rule.condition) {
    case "equals":
      return areValuesEqual(fieldValue, rule.value);

    case "notEquals":
      return !areValuesEqual(fieldValue, rule.value);

    case "contains":
      return containsValue(fieldValue, rule.value);

    case "greaterThan": {
      const source = toNumber(fieldValue);
      const target = toNumber(rule.value);
      if (source === null || target === null) {
        return false;
      }
      return source > target;
    }

    case "lessThan": {
      const source = toNumber(fieldValue);
      const target = toNumber(rule.value);
      if (source === null || target === null) {
        return false;
      }
      return source < target;
    }

    case "isEmpty":
      return isValueEmpty(fieldValue);

    case "isNotEmpty":
      return !isValueEmpty(fieldValue);

    default:
      return true;
  }
}

/**
 * Determine if a field should be visible based on its visibility configuration.
 * Returns `true` when no visibility rules exist.
 */
export function shouldFieldBeVisible(
  field: FormField,
  formData: Record<string, unknown>
): boolean {
  const config = getFieldVisibilityConfig(field);

  if (!config) {
    return true;
  }

  if (config.match === "any") {
    return config.rules.some((rule) => evaluateVisibilityRule(rule, formData));
  }

  return config.rules.every((rule) => evaluateVisibilityRule(rule, formData));
}

/**
 * Return the list of dependencies a field relies on for visibility evaluation.
 */
export function getFieldVisibilityDependencies(field: FormField): string[] {
  const config = getFieldVisibilityConfig(field);
  if (!config) {
    return [];
  }

  const dependencies = new Set<string>();
  config.rules.forEach((rule) => {
    dependencies.add(rule.dependsOn);
  });
  return Array.from(dependencies);
}

