import { prisma } from "@/lib/prisma";
import type { FormConfigWithFields } from "./types";

// Simple in-memory cache for form configs (they rarely change)
// Cache entries expire after 30 minutes
const formConfigCache = new Map<
  string,
  { data: FormConfigWithFields | null; timestamp: number }
>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCacheKey(type: "entity-geo" | "id", ...args: string[]): string {
  return `${type}:${args.join(":")}`;
}

function getFromCache(key: string): FormConfigWithFields | null | undefined {
  const cached = formConfigCache.get(key);
  if (!cached) return undefined;

  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
  if (isExpired) {
    formConfigCache.delete(key);
    return undefined;
  }

  return cached.data;
}

function setCache(key: string, data: FormConfigWithFields | null): void {
  formConfigCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetches the active form config by entity code and geography code
 * Returns the most recent active version
 * Results are cached for 30 minutes
 */
export async function getFormConfigByEntityAndGeography(
  entityCode: string,
  geographyCode: string
): Promise<FormConfigWithFields | null> {
  const cacheKey = getCacheKey("entity-geo", entityCode, geographyCode);
  const cached = getFromCache(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const formConfig = await prisma.formConfig.findFirst({
    where: {
      isActive: true,
      entity: {
        code: {
          equals: entityCode,
          mode: "insensitive",
        },
      },
      geography: {
        code: {
          equals: geographyCode,
          mode: "insensitive",
        },
      },
    },
    select: {
      id: true,
      entityId: true,
      geographyId: true,
      version: true,
      title: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      entity: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
        },
      },
      geography: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      sections: {
        select: {
          id: true,
          formConfigId: true,
          title: true,
          description: true,
          order: true,
          fields: {
            select: {
              id: true,
              sectionId: true,
              name: true,
              label: true,
              type: true,
              placeholder: true,
              helpText: true,
              validationRules: true,
              options: true,
              order: true,
              visibilityConditions: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
      documentRules: {
        select: {
          id: true,
          formConfigId: true,
          documentTypeId: true,
          required: true,
          validationRules: true,
          documentType: {
            select: {
              id: true,
              key: true,
              label: true,
              category: true,
              description: true,
            },
          },
        },
      },
    },
    orderBy: {
      version: "desc",
    },
  });

  const result = formConfig as FormConfigWithFields | null;
  setCache(cacheKey, result);
  return result;
}

/**
 * Fetches a form config by its ID
 * Results are cached for 30 minutes
 */
export async function getFormConfigById(
  formConfigId: string
): Promise<FormConfigWithFields | null> {
  const cacheKey = getCacheKey("id", formConfigId);
  const cached = getFromCache(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const formConfig = await prisma.formConfig.findUnique({
    where: {
      id: formConfigId,
    },
    select: {
      id: true,
      entityId: true,
      geographyId: true,
      version: true,
      title: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      entity: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
        },
      },
      geography: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      sections: {
        select: {
          id: true,
          formConfigId: true,
          title: true,
          description: true,
          order: true,
          fields: {
            select: {
              id: true,
              sectionId: true,
              name: true,
              label: true,
              type: true,
              placeholder: true,
              helpText: true,
              validationRules: true,
              options: true,
              order: true,
              visibilityConditions: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
      documentRules: {
        select: {
          id: true,
          formConfigId: true,
          documentTypeId: true,
          required: true,
          validationRules: true,
          documentType: {
            select: {
              id: true,
              key: true,
              label: true,
              category: true,
              description: true,
            },
          },
        },
      },
    },
  });

  const result = formConfig as FormConfigWithFields | null;
  setCache(cacheKey, result);
  return result;
}

/**
 * Validates that a form config exists and is active (if required)
 */
export async function validateFormConfig(
  formConfigId: string,
  requireActive: boolean = false
): Promise<{ valid: boolean; formConfig: FormConfigWithFields | null }> {
  const formConfig = await getFormConfigById(formConfigId);

  if (!formConfig) {
    return { valid: false, formConfig: null };
  }

  if (requireActive && !formConfig.isActive) {
    return { valid: false, formConfig: null };
  }

  return { valid: true, formConfig };
}

