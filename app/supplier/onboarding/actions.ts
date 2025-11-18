"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SupplierWizardData,
  supplierWizardSchema,
} from "@/lib/supplierWizardSchema";

async function getApplicationForUser(applicationId: string, userId: string) {
  return prisma.application.findFirst({
    where: {
      id: applicationId,
      organization: {
        members: { some: { userId } },
      },
    },
  });
}

export async function saveDraftAction(
  applicationId: string,
  formData: SupplierWizardData
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

  const parsed = supplierWizardSchema.safeParse(formData);
  if (!parsed.success) {
    throw new Error("Validation failed");
  }

  await prisma.application.update({
    where: { id: application.id },
    data: {
      data: parsed.data,
      updatedById: session.user.id,
    },
  });

  return { ok: true };
}

export async function submitApplicationAction(applicationId: string) {
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

  if (application.status !== "DRAFT" && application.status !== "PENDING_SUPPLIER") {
    throw new Error("Only drafts or pending clarifications can be submitted");
  }

  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      updatedById: session.user.id,
      auditLogs: {
        create: {
          actorId: session.user.id,
          actorRole: "SUPPLIER",
          organizationId: application.organizationId,
          action: "APPLICATION_SUBMITTED",
          details: { note: "Submitted from supplier portal" },
        },
      },
    },
  });

  // Placeholder notification hook for procurement queue
  console.info(
    `[Application] ${application.id} submitted by user ${session.user.id}`
  );

  return { ok: true };
}

