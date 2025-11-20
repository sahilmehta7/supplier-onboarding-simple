"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SupplierWizardData,
  supplierWizardSchema,
} from "@/lib/supplierWizardSchema";
import {
  canEditApplication,
  canSubmitApplication,
  hasActiveApplication,
  getEditableFields,
} from "@/lib/application-validation";
import { updateApplicationWithVersion } from "@/lib/optimistic-locking";
import { revalidatePath } from "next/cache";

async function getApplicationForUser(applicationId: string, userId: string) {
  return prisma.application.findFirst({
    where: {
      id: applicationId,
      organization: {
        members: { some: { userId } },
      },
    },
    include: {
      formConfig: true,
    },
  });
}

export async function saveDraftAction(
  applicationId: string,
  formData: SupplierWizardData,
  editedFields?: string[], // Track which fields were edited
  expectedVersion?: number // Add version parameter for optimistic locking
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const application = await getApplicationForUser(
    applicationId,
    session.user.id
  );

  if (!application) {
    throw new Error("Application not found");
  }

  // Check if editing is allowed
  if (!canEditApplication(application.status)) {
    throw new Error(
      `Cannot edit application in ${application.status} status. Only DRAFT and PENDING_SUPPLIER applications can be edited.`
    );
  }

  // If PENDING_SUPPLIER, validate only specified fields are edited
  if (application.status === "PENDING_SUPPLIER" && editedFields) {
    const allowedFields = await getEditableFields(applicationId);
    const invalidFields = editedFields.filter(
      (field) => !allowedFields.includes(field)
    );
    if (invalidFields.length > 0) {
      throw new Error(
        `Cannot edit fields: ${invalidFields.join(", ")}. Only specified fields can be edited.`
      );
    }
  }

  const parsed = supplierWizardSchema.safeParse(formData);
  if (!parsed.success) {
    throw new Error("Validation failed");
  }

  // Use optimistic locking update
  const newVersion = await updateApplicationWithVersion(
    applicationId,
    expectedVersion ?? application.version,
    {
      data: parsed.data,
      updatedById: session.user.id,
    }
  );

  revalidatePath(`/supplier/onboarding/${applicationId}`);
  return { ok: true, version: newVersion };
}

export async function submitApplicationAction(
  applicationId: string,
  expectedVersion?: number // Add version parameter for optimistic locking
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const application = await getApplicationForUser(
    applicationId,
    session.user.id
  );

  if (!application) {
    throw new Error("Application not found");
  }

  // Check if submission is allowed
  if (!canSubmitApplication(application.status)) {
    throw new Error(
      `Cannot submit application in ${application.status} status. Only DRAFT and PENDING_SUPPLIER applications can be submitted.`
    );
  }

  // Check for duplicate active applications
  if (application.formConfigId) {
    // Only check for duplicates if this is a DRAFT (not PENDING_SUPPLIER resubmission)
    if (application.status === "DRAFT") {
      // Exclude current application from duplicate check
      const otherActive = await prisma.application.findFirst({
        where: {
          organizationId: application.organizationId,
          formConfigId: application.formConfigId,
          status: {
            in: ["DRAFT", "SUBMITTED", "IN_REVIEW", "PENDING_SUPPLIER", "APPROVED"],
          },
          id: { not: application.id },
        },
      });
      if (otherActive) {
        throw new Error(
          "An active application already exists for this form configuration. Please complete or cancel the existing application first."
        );
      }
    }
  }

  // Use optimistic locking update
  const newVersion = await updateApplicationWithVersion(
    applicationId,
    expectedVersion ?? application.version,
    {
      status: "SUBMITTED",
      submittedAt: new Date(),
      submittedById: session.user.id,
      submissionType: "SUPPLIER",
      updatedById: session.user.id,
    }
  );

  // Create audit log separately (not part of version update)
  await prisma.auditLog.create({
    data: {
      applicationId: application.id,
      actorId: session.user.id,
      actorRole: "SUPPLIER",
      organizationId: application.organizationId,
      action: "APPLICATION_SUBMITTED",
      details: {
        submissionType: "SUPPLIER",
        note: "Submitted from supplier portal",
      },
    },
  });

  revalidatePath(`/supplier/onboarding/${applicationId}`);
  revalidatePath("/supplier");

  console.info(
    `[Application] ${application.id} submitted by user ${session.user.id}`
  );

  return { ok: true, version: newVersion };
}

export async function checkActiveApplicationAction(
  organizationId: string,
  formConfigId: string
) {
  const hasActive = await hasActiveApplication(organizationId, formConfigId);
  return { hasActive };
}

