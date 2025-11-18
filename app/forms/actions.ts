"use server";

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

interface SaveFormDraftInput {
  formConfigId: string;
  organizationId: string;
  entityId: string;
  geographyId: string;
  applicationId?: string | null;
  formData: Record<string, unknown>;
  currentStep: number;
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
  });

  return {
    success: true,
    applicationId: record.applicationId,
    currentStep: record.currentStep,
    updatedAt: record.lastSavedAt,
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

