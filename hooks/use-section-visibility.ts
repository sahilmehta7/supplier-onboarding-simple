"use client";

import { useMemo } from "react";
import type { FormSection } from "@prisma/client";

import { getSectionVisibilityState } from "@/lib/forms/section-visibility";

export function useSectionVisibility(
  sections: FormSection[],
  formData: Record<string, unknown>
): Record<string, boolean> {
  return useMemo(
    () => getSectionVisibilityState(sections, formData),
    [sections, formData]
  );
}

