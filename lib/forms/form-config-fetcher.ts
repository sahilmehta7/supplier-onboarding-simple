import { prisma } from "@/lib/prisma";
import type { FormConfigWithFields } from "./types";

/**
 * Fetches the active form config by entity code and geography code
 * Returns the most recent active version
 */
export async function getFormConfigByEntityAndGeography(
  entityCode: string,
  geographyCode: string
): Promise<FormConfigWithFields | null> {
  const formConfig = await prisma.formConfig.findFirst({
    where: {
      isActive: true,
      entity: {
        code: entityCode,
      },
      geography: {
        code: geographyCode,
      },
    },
    include: {
      entity: true,
      geography: true,
      sections: {
        include: {
          fields: {
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
        include: {
          documentType: true,
        },
      },
    },
    orderBy: {
      version: "desc",
    },
  });

  return formConfig as FormConfigWithFields | null;
}

/**
 * Fetches a form config by its ID
 */
export async function getFormConfigById(
  formConfigId: string
): Promise<FormConfigWithFields | null> {
  const formConfig = await prisma.formConfig.findUnique({
    where: {
      id: formConfigId,
    },
    include: {
      entity: true,
      geography: true,
      sections: {
        include: {
          fields: {
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
        include: {
          documentType: true,
        },
      },
    },
  });

  return formConfig as FormConfigWithFields | null;
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

