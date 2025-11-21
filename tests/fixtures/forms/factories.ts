import type { FormField } from "@prisma/client";

let fieldCounter = 0;

export function createFormField(overrides: Partial<FormField> = {}): FormField {
  const now = new Date("2024-01-01T00:00:00.000Z");
  fieldCounter += 1;

  return {
    id: overrides.id ?? `field-${fieldCounter}`,
    sectionId: overrides.sectionId ?? "section-1",
    key: overrides.key ?? `field_${fieldCounter}`,
    label: overrides.label ?? "Sample Field",
    type: overrides.type ?? "text",
    placeholder: overrides.placeholder ?? null,
    helpText: overrides.helpText ?? null,
    required: overrides.required ?? false,
    options: overrides.options ?? null,
    validation: overrides.validation ?? null,
    visibility: overrides.visibility ?? null,
    order: overrides.order ?? 0,
    isSensitive: overrides.isSensitive ?? false,
    externalValidator: overrides.externalValidator ?? null,
    validatorParams: overrides.validatorParams ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

export function createVisibilityField(
  visibility: unknown,
  overrides: Partial<FormField> = {}
): FormField {
  return createFormField({
    visibility: visibility as FormField["visibility"],
    ...overrides,
  });
}


