"use server";

import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteDraftRecord,
  listDraftSummaries,
  loadDraftRecord,
  saveDraftRecord,
  type DraftRecord,
  type DraftSummary,
} from "@/lib/forms/draft-manager";
import { validateDocumentFields } from "@/lib/forms/document-validator";

interface SaveFormDraftInput {
  formConfigId: string;
  organizationId: string;
  entityId: string;
  geographyId: string;
  applicationId?: string | null;
  formData: Record<string, unknown>;
  currentStep: number;
  hiddenSections: string[];
}

interface SubmitFormInput {
  formConfigId: string;
  organizationId: string;
  entityId: string;
  geographyId: string;
  applicationId?: string | null;
  formData: Record<string, unknown>;
  hiddenSections: string[];
}

interface SubmitFormResult {
  success: boolean;
  applicationId: string;
}

export interface DraftSaveResult {
  success: boolean;
  applicationId: string;
  currentStep: number;
  updatedAt: string;
}

export interface DraftLoadResult extends DraftRecord {}

interface LoadFormDraftInput {
  organizationId: string;
  applicationId: string;
}

interface DeleteFormDraftInput extends LoadFormDraftInput {}

interface ListDraftsInput {
  organizationId: string;
  formConfigId: string;
  entityId: string;
  geographyId: string;
}

async function ensureMembership(userId: string, organizationId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("Unauthorized");
  }
}

export async function saveFormDraft(
  input: SaveFormDraftInput
): Promise<DraftSaveResult> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await ensureMembership(session.user.id, input.organizationId);

  const record = await saveDraftRecord({
    applicationId: input.applicationId,
    formConfigId: input.formConfigId,
    organizationId: input.organizationId,
    entityId: input.entityId,
    geographyId: input.geographyId,
    formData: input.formData,
    currentStep: input.currentStep,
    userId: session.user.id,
    hiddenSections: input.hiddenSections,
  });

  return {
    success: true,
    applicationId: record.applicationId,
    currentStep: record.currentStep,
    updatedAt: record.lastSavedAt,
  };
}

export async function submitFormApplication(
  input: SubmitFormInput
): Promise<SubmitFormResult> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await ensureMembership(session.user.id, input.organizationId);

  // Fetch form config to validate documents
  const formConfig = await prisma.formConfig.findUnique({
    where: { id: input.formConfigId },
    include: {
      sections: {
        include: { fields: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!formConfig) {
    throw new Error("Form configuration not found");
  }

  // Validate document fields exist in storage
  const allFields = formConfig.sections.flatMap((section) => section.fields);
  const documentValidation = await validateDocumentFields(
    input.formData,
    allFields
  );

  if (!documentValidation.isValid) {
    const errorMessages = Object.values(documentValidation.errors).join(", ");
    throw new Error(`Document validation failed: ${errorMessages}`);
  }

  const hiddenSections = Array.from(
    new Set((input.hiddenSections ?? []).filter(Boolean))
  );

  const auditEntries = [
    {
      actorId: session.user.id,
      actorRole: null,
      organizationId: input.organizationId,
      action: "APPLICATION_SUBMITTED",
      details: {
        source: "dynamic_form_wizard",
        hiddenSections,
      },
    },
    ...hiddenSections.map((sectionKey) => ({
      actorId: session.user.id,
      actorRole: null,
      organizationId: input.organizationId,
      action: "FORM_SECTION_HIDDEN",
      details: {
        sectionKey,
      },
    })),
  ];

  const submissionData = {
    data: input.formData as Prisma.InputJsonValue,
    hiddenSections,
    status: "SUBMITTED" as const,
    submittedAt: new Date(),
    updatedById: session.user.id,
    auditLogs: {
      create: auditEntries,
    },
  };

  let application;
  if (input.applicationId) {
    application = await prisma.application.update({
      where: {
        id: input.applicationId,
        organizationId: input.organizationId,
        createdById: session.user.id,
      },
      data: submissionData,
    });
  } else {
    application = await prisma.application.create({
      data: {
        ...submissionData,
        organizationId: input.organizationId,
        entityId: input.entityId,
        geographyId: input.geographyId,
        formConfigId: input.formConfigId,
        createdById: session.user.id,
      },
    });
  }

  console.info(
    `[form.section_hidden] application=${application.id} hidden=${hiddenSections.join(",")}`
  );

  return {
    success: true,
    applicationId: application.id,
  };
}

export async function loadFormDraft(
  input: LoadFormDraftInput
): Promise<DraftLoadResult | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await ensureMembership(session.user.id, input.organizationId);

  return loadDraftRecord({
    applicationId: input.applicationId,
    organizationId: input.organizationId,
    userId: session.user.id,
  });
}

export async function deleteFormDraft(
  input: DeleteFormDraftInput
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await ensureMembership(session.user.id, input.organizationId);
  await deleteDraftRecord({
    applicationId: input.applicationId,
    organizationId: input.organizationId,
    userId: session.user.id,
  });

  return { success: true };
}

export async function getUserDrafts(
  input: ListDraftsInput
): Promise<DraftSummary[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await ensureMembership(session.user.id, input.organizationId);

  return listDraftSummaries({
    formConfigId: input.formConfigId,
    organizationId: input.organizationId,
    entityId: input.entityId,
    geographyId: input.geographyId,
    userId: session.user.id,
  });
}

