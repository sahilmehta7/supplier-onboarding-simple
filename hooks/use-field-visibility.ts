"use client";

import { useMemo } from "react";
import type { FormField } from "@prisma/client";
import {
  getFieldVisibilityDependencies,
  shouldFieldBeVisible,
} from "@/lib/forms/visibility-engine";

function buildFieldMap(fields: FormField[]): Map<string, FormField> {
  const map = new Map<string, FormField>();
  fields.forEach((field) => {
    map.set(field.key, field);
  });
  return map;
}

export function getFieldVisibilityState(
  fields: FormField[],
  formData: Record<string, unknown>
): Record<string, boolean> {
  const fieldMap = buildFieldMap(fields);
  const visibilityCache = new Map<string, boolean>();
  const visiting = new Set<string>();

  const resolveVisibility = (fieldKey: string): boolean => {
    if (visibilityCache.has(fieldKey)) {
      return visibilityCache.get(fieldKey)!;
    }

    const field = fieldMap.get(fieldKey);
    if (!field) {
      visibilityCache.set(fieldKey, true);
      return true;
    }

    if (visiting.has(fieldKey)) {
      console.warn(
        `[visibility] Circular dependency detected for field "${fieldKey}".`
      );
      visibilityCache.set(fieldKey, false);
      return false;
    }

    visiting.add(fieldKey);
    const dependencies = getFieldVisibilityDependencies(field);
    const dependenciesVisible = dependencies.every((dependencyKey) =>
      resolveVisibility(dependencyKey)
    );
    const isVisible =
      dependenciesVisible && shouldFieldBeVisible(field, formData);
    visiting.delete(fieldKey);
    visibilityCache.set(fieldKey, isVisible);
    return isVisible;
  };

  const visibilityState: Record<string, boolean> = {};
  fieldMap.forEach((_field, fieldKey) => {
    visibilityState[fieldKey] = resolveVisibility(fieldKey);
  });
  return visibilityState;
}

/**
 * Compute visibility state for a list of fields based on current form data.
 * Handles cascading dependencies and circular dependency detection.
 */
export function useFieldVisibility(
  fields: FormField[],
  formData: Record<string, unknown>
): Record<string, boolean> {
  return useMemo(
    () => getFieldVisibilityState(fields, formData),
    [fields, formData]
  );
}

