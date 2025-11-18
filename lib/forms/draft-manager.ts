import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DRAFT_META_KEY = "__draftMeta";

interface DraftMeta {
  currentStep: number;
  updatedAt: string;
}

interface PersistedDraftPayload {
  [key: string]: unknown;
  [DRAFT_META_KEY]?: DraftMeta;
}

export interface DraftSummary {
  applicationId: string;
  formConfigId: string;
  title: string;
  lastSavedAt: string;
  currentStep: number;
  totalSteps: number;
}

export interface DraftRecord {
  applicationId: string;
  formConfigId: string;
  formData: Record<string, unknown>;
  currentStep: number;
  lastSavedAt: string;
}

export interface SaveDraftOptions {
  applicationId?: string | null;
  formConfigId: string;
  organizationId: string;
  entityId: string;
  geographyId: string;
  userId: string;
  formData: Record<string, unknown>;
  currentStep: number;
}

export interface LoadDraftOptions {
  applicationId: string;
  organizationId: string;
  userId: string;
}

export interface DraftQueryOptions {
  formConfigId: string;
  organizationId: string;
  entityId: string;
  geographyId: string;
  userId: string;
}

export interface DeleteDraftOptions {
  applicationId: string;
  organizationId: string;
  userId: string;
}

function encodeDraftPayload(
  formData: Record<string, unknown>,
  currentStep: number
): PersistedDraftPayload {
  return {
    ...formData,
    [DRAFT_META_KEY]: {
      currentStep,
      updatedAt: new Date().toISOString(),
    },
  };
}

function decodeDraftPayload(
  payload: PersistedDraftPayload | null | undefined,
  fallbackUpdatedAt: string
) {
  const clonedPayload = { ...(payload ?? {}) };
  const metaRaw = clonedPayload[DRAFT_META_KEY];
  delete clonedPayload[DRAFT_META_KEY];

  const meta = (metaRaw as DraftMeta | undefined) ?? {
    currentStep: 0,
    updatedAt: fallbackUpdatedAt,
  };

  return {
    formData: clonedPayload,
    currentStep: Number.isFinite(meta.currentStep) ? meta.currentStep : 0,
    lastSavedAt: meta.updatedAt ?? fallbackUpdatedAt,
  };
}

function mapApplicationToRecord(application: {
  id: string;
  formConfigId: string | null;
  data: Prisma.JsonValue | null;
  updatedAt: Date;
}): DraftRecord {
  const decoded = decodeDraftPayload(
    (application.data as PersistedDraftPayload | null) ?? null,
    application.updatedAt.toISOString()
  );

  return {
    applicationId: application.id,
    formConfigId: application.formConfigId ?? "",
    formData: decoded.formData,
    currentStep: decoded.currentStep,
    lastSavedAt: decoded.lastSavedAt ?? application.updatedAt.toISOString(),
  };
}

export async function saveDraftRecord(
  options: SaveDraftOptions
): Promise<DraftRecord> {
  const payload = encodeDraftPayload(options.formData, options.currentStep);

  if (options.applicationId) {
    const existing = await prisma.application.findFirst({
      where: {
        id: options.applicationId,
        organizationId: options.organizationId,
        createdById: options.userId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Draft not found or access denied");
    }

    const updated = await prisma.application.update({
      where: { id: options.applicationId },
      data: {
        data: payload as Prisma.InputJsonValue,
        formConfigId: options.formConfigId,
        entityId: options.entityId,
        geographyId: options.geographyId,
        updatedById: options.userId,
        status: "DRAFT",
      },
      select: {
        id: true,
        data: true,
        updatedAt: true,
        formConfigId: true,
      },
    });

    return mapApplicationToRecord(updated);
  }

    const created = await prisma.application.create({
    data: {
      organizationId: options.organizationId,
      entityId: options.entityId,
      geographyId: options.geographyId,
      formConfigId: options.formConfigId,
      status: "DRAFT",
        data: payload as Prisma.InputJsonValue,
      createdById: options.userId,
      updatedById: options.userId,
    },
    select: {
      id: true,
      data: true,
      updatedAt: true,
      formConfigId: true,
    },
  });

  return mapApplicationToRecord(created);
}

export async function loadDraftRecord(
  options: LoadDraftOptions
): Promise<DraftRecord | null> {
  const draft = await prisma.application.findFirst({
    where: {
      id: options.applicationId,
      organizationId: options.organizationId,
      createdById: options.userId,
      status: "DRAFT",
    },
    select: {
      id: true,
      data: true,
      updatedAt: true,
      formConfigId: true,
    },
  });

  if (!draft) {
    return null;
  }

  return mapApplicationToRecord(draft);
}

export async function listDraftSummaries(
  options: DraftQueryOptions
): Promise<DraftSummary[]> {
  const drafts = await prisma.application.findMany({
    where: {
      status: "DRAFT",
      organizationId: options.organizationId,
      entityId: options.entityId,
      geographyId: options.geographyId,
      formConfigId: options.formConfigId,
      createdById: options.userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      data: true,
      updatedAt: true,
      formConfigId: true,
      formConfig: {
        select: {
          title: true,
          sections: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  return drafts.map((draft) => {
    const decoded = decodeDraftPayload(
      draft.data as PersistedDraftPayload,
      draft.updatedAt.toISOString()
    );

    return {
      applicationId: draft.id,
      formConfigId: draft.formConfigId ?? "",
      title: draft.formConfig?.title ?? "Untitled Form",
      currentStep: decoded.currentStep,
      lastSavedAt: draft.updatedAt.toISOString(),
      totalSteps: draft.formConfig?.sections.length ?? 0,
    };
  });
}

export async function deleteDraftRecord(
  options: DeleteDraftOptions
): Promise<void> {
  await prisma.application.deleteMany({
    where: {
      id: options.applicationId,
      organizationId: options.organizationId,
      createdById: options.userId,
      status: "DRAFT",
    },
  });
}

