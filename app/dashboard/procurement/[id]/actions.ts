"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { canTransition, getValidTransitions } from "@/lib/application-state";
import {
  createSupplierFromApplication,
  updateSupplierFromApplication,
} from "@/lib/suppliers";

interface CommentInput {
  applicationId: string;
  body: string;
  visibility: "supplier_visible" | "internal_only";
  markPending?: boolean;
}

export async function addCommentAction(input: CommentInput) {
  const { applicationId, body, visibility, markPending } = input;

  if (!body.trim()) {
    throw new Error("Comment body cannot be empty.");
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireRole(["ADMIN", "PROCUREMENT"]);

  await prisma.applicationComment.create({
    data: {
      applicationId,
      authorId: session.user.id,
      body,
      visibility,
    },
  });

  if (markPending && visibility === "supplier_visible") {
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "PENDING_SUPPLIER",
      },
    });
    console.info(
      `[Clarification] Application ${applicationId} flagged for supplier response.`
    );
  }

  await prisma.auditLog.create({
    data: {
      applicationId,
      actorId: session.user.id,
      actorRole: "PROCUREMENT",
      action: visibility === "supplier_visible" ? "COMMENT_SUPPLIER" : "COMMENT_INTERNAL",
      details: {
        note: body.slice(0, 280),
      },
    },
  });

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  return { ok: true };
}

interface TransitionInput {
  applicationId: string;
  targetStatus: "IN_REVIEW" | "PENDING_SUPPLIER" | "APPROVED" | "REJECTED";
  note?: string;
}

export async function transitionApplicationAction(input: TransitionInput) {
  const { applicationId, targetStatus, note } = input;
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireRole(["ADMIN", "PROCUREMENT"]);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { status: true, supplierId: true },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (!canTransition(application.status, targetStatus)) {
    const validTransitions = getValidTransitions(application.status);
    throw new Error(
      `Invalid state transition: Cannot transition from ${application.status} to ${targetStatus}. ` +
        `Valid transitions from ${application.status} are: ${validTransitions.length > 0 ? validTransitions.join(", ") : "none"}.`
    );
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: targetStatus,
      updatedById: session.user.id,
      approvedAt: targetStatus === "APPROVED" ? new Date() : undefined,
      auditLogs: {
        create: {
          actorId: session.user.id,
          actorRole: "PROCUREMENT",
          action: `STATUS_${targetStatus}`,
          details: {
            note: note ?? "",
          },
        },
      },
    },
  });

  // Create or update Supplier when approved
  if (targetStatus === "APPROVED") {
    try {
      if (application.supplierId) {
        // Update existing Supplier
        await updateSupplierFromApplication(applicationId);
      } else {
        // Create new Supplier
        await createSupplierFromApplication(applicationId);
      }
    } catch (error) {
      console.error("Error creating/updating Supplier:", error);
      // Log error but don't fail the transition
      // Supplier creation can be retried later if needed
    }
  }

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  revalidatePath(`/supplier`); // Revalidate supplier dashboard
  console.info(
    `[Transition] Application ${applicationId} -> ${targetStatus} by ${session.user.id}`
  );
  return { ok: true };
}

export async function claimApplicationAction(applicationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  await requireRole(["ADMIN", "PROCUREMENT"]);

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      updatedById: session.user.id,
    },
  });

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  return { ok: true };
}

interface CreateApplicationInput {
  organizationId: string;
  formConfigId: string;
  initialData?: Record<string, unknown>;
}

export async function createApplicationOnBehalfAction(
  input: CreateApplicationInput
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Require internal team role
  await requireRole(["ADMIN", "PROCUREMENT", "MEMBER"]);

  const { organizationId, formConfigId, initialData } = input;

  // Verify organization exists
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Verify form config exists
  const formConfig = await prisma.formConfig.findUnique({
    where: { id: formConfigId },
    include: {
      entity: true,
      geography: true,
    },
  });

  if (!formConfig) {
    throw new Error("Form configuration not found");
  }

  // Check for existing active applications (prevent duplicates)
  const existingActive = await prisma.application.findFirst({
    where: {
      organizationId,
      formConfigId,
      status: {
        in: ["DRAFT", "SUBMITTED", "IN_REVIEW", "PENDING_SUPPLIER", "APPROVED"],
      },
    },
  });

  if (existingActive) {
    throw new Error(
      "An active application already exists for this organization and form configuration"
    );
  }

  // Create application
  const application = await prisma.application.create({
    data: {
      organizationId,
      formConfigId,
      entityId: formConfig.entityId,
      geographyId: formConfig.geographyId,
      status: "DRAFT",
      data: initialData ?? {},
      createdById: session.user.id,
      updatedById: session.user.id,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      applicationId: application.id,
      actorId: session.user.id,
      actorRole: "PROCUREMENT",
      action: "APPLICATION_CREATED",
      details: {
        note: "Application created by internal team",
        createdBy: "INTERNAL",
      },
    },
  });

  revalidatePath(`/dashboard/procurement/${application.id}`);
  revalidatePath(`/dashboard/procurement`);

  return { ok: true, applicationId: application.id };
}

export async function submitOnBehalfAction(applicationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Require internal team role
  await requireRole(["ADMIN", "PROCUREMENT", "MEMBER"]);

  // Get application with form config
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      formConfig: true,
    },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  // Only allow submission from DRAFT or PENDING_SUPPLIER status
  if (application.status !== "DRAFT" && application.status !== "PENDING_SUPPLIER") {
    throw new Error(
      `Cannot submit application in ${application.status} status. Only DRAFT and PENDING_SUPPLIER applications can be submitted.`
    );
  }

  // Check for duplicate active applications (only for DRAFT status)
  if (application.status === "DRAFT") {
    const existingActive = await prisma.application.findFirst({
      where: {
        organizationId: application.organizationId,
        formConfigId: application.formConfigId,
        status: {
          in: ["DRAFT", "SUBMITTED", "IN_REVIEW", "PENDING_SUPPLIER", "APPROVED"],
        },
        id: { not: applicationId },
      },
    });

    if (existingActive) {
      throw new Error(
        "An active application already exists for this organization and form configuration"
      );
    }
  }

  // Update application status
  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      submittedById: session.user.id,
      submissionType: "INTERNAL",
      updatedById: session.user.id,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      applicationId,
      actorId: session.user.id,
      actorRole: "PROCUREMENT",
      action: "APPLICATION_SUBMITTED",
      details: {
        note: "Application submitted by internal team",
        submissionType: "INTERNAL",
        submittedBy: session.user.name ?? session.user.email ?? "Internal Team",
      },
    },
  });

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  revalidatePath(`/dashboard/procurement`);

  return { ok: true };
}

interface EditDraftInput {
  applicationId: string;
  formData: Record<string, unknown>;
}

export async function editDraftOnBehalfAction(input: EditDraftInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Require internal team role
  await requireRole(["ADMIN", "PROCUREMENT", "MEMBER"]);

  const { applicationId, formData } = input;

  // Get application
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  // Only allow editing DRAFT or PENDING_SUPPLIER applications
  if (application.status !== "DRAFT" && application.status !== "PENDING_SUPPLIER") {
    throw new Error(
      `Cannot edit application in ${application.status} status. Only DRAFT and PENDING_SUPPLIER applications can be edited.`
    );
  }

  // Update application data
  await prisma.application.update({
    where: { id: applicationId },
    data: {
      data: formData,
      updatedById: session.user.id,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      applicationId,
      actorId: session.user.id,
      actorRole: "PROCUREMENT",
      action: "APPLICATION_UPDATED",
      details: {
        note: "Application edited by internal team",
        editedBy: "INTERNAL",
      },
    },
  });

  revalidatePath(`/dashboard/procurement/${applicationId}`);

  return { ok: true };
}

