import type { Prisma } from "@prisma/client";

import { normalizeVisibilityConfig } from "@/lib/forms/visibility-engine";

type VisibilityPayloadSuccess =
  | { success: true; provided: false }
  | { success: true; provided: true; value: Prisma.JsonValue | null };

type VisibilityPayloadFailure = {
  success: false;
  message: string;
};

export type VisibilityPayloadResult =
  | VisibilityPayloadSuccess
  | VisibilityPayloadFailure;

const INVALID_VISIBILITY_MESSAGE =
  "Invalid visibility configuration. Provide at least one rule or disable conditional visibility.";

export function parseVisibilityPayload(raw: unknown): VisibilityPayloadResult {
  if (raw === undefined) {
    return { success: true, provided: false };
  }

  if (raw === null) {
    return { success: true, provided: true, value: null };
  }

  const normalized = normalizeVisibilityConfig(raw);
  if (!normalized) {
    return {
      success: false,
      message: INVALID_VISIBILITY_MESSAGE,
    };
  }

  return {
    success: true,
    provided: true,
    value: normalized as any,
  };
}

