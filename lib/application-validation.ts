import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";

const ACTIVE_STATUSES: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "PENDING_SUPPLIER",
  "APPROVED",
];

/**
 * Check if an organization has an active application for a form config
 */
export async function hasActiveApplication(
  organizationId: string,
  formConfigId: string
): Promise<boolean> {
  const activeApp = await prisma.application.findFirst({
    where: {
      organizationId,
      formConfigId,
      status: { in: ACTIVE_STATUSES },
    },
  });
  return !!activeApp;
}

/**
 * Check if an application can be edited based on its status
 */
export function canEditApplication(status: ApplicationStatus): boolean {
  return status === "DRAFT" || status === "PENDING_SUPPLIER";
}

/**
 * Check if an application can be submitted based on its status
 */
export function canSubmitApplication(status: ApplicationStatus): boolean {
  return status === "DRAFT" || status === "PENDING_SUPPLIER";
}

/**
 * Get list of editable field keys for PENDING_SUPPLIER status
 * Returns field keys from comments that are supplier-visible
 */
export async function getEditableFields(
  applicationId: string
): Promise<string[]> {
  const comments = await prisma.applicationComment.findMany({
    where: {
      applicationId,
      visibility: "supplier_visible",
      fieldKey: { not: null },
    },
    select: { fieldKey: true },
  });
  
  return comments
    .map((c) => c.fieldKey)
    .filter((key): key is string => key !== null && key !== undefined);
}

