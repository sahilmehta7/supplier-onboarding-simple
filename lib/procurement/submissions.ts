import { ApplicationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { getSignedDocumentUrl } from "@/lib/documents";

export const SUBMISSION_PAGE_SIZE = 50;

export const SORT_FIELDS = [
  "submittedAt",
  "updatedAt",
  "status",
  "supplier",
  "entity",
  "geography",
] as const;

export type SubmissionSortField = (typeof SORT_FIELDS)[number];
export type SubmissionSortDirection = "asc" | "desc";

export interface SubmissionListParams {
  page?: number;
  search?: string;
  entityCodes?: string[];
  geographyCodes?: string[];
  statuses?: ApplicationStatus[];
  ownerIds?: string[];
  submittedFrom?: Date | null;
  submittedTo?: Date | null;
  sortField?: SubmissionSortField;
  sortDirection?: SubmissionSortDirection;
}

export interface SubmissionRow {
  id: string;
  supplierName: string;
  organizationName: string | null;
  entity: {
    id: string;
    name: string;
    code: string;
  };
  geography: {
    id: string;
    name: string;
    code: string;
  };
  status: ApplicationStatus;
  submittedAt: Date | null;
  updatedAt: Date;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  submittedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  submissionType: "SUPPLIER" | "INTERNAL" | null;
}

export interface SubmissionListResult {
  data: SubmissionRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  filterMeta: {
    entities: Array<{ id: string; code: string; name: string }>;
    geographies: Array<{ id: string; code: string; name: string }>;
    statuses: ApplicationStatus[];
    owners: Array<{ id: string; name: string | null; email: string | null }>;
  };
}

export interface SubmissionSectionField {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  helpText: string | null;
  options: unknown;
  isSensitive: boolean;
  value: unknown;
}

export interface SubmissionSection {
  id: string;
  key: string;
  label: string;
  order: number;
  fields: SubmissionSectionField[];
}

export interface SubmissionAttachment {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedAt: Date;
  previewUrl: string;
  type: {
    id: string;
    key: string | null;
    label: string;
    category: string | null;
  };
  uploadedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export interface SubmissionComment {
  id: string;
  body: string;
  visibility: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export interface SubmissionActivityEntry {
  id: string;
  type: "status" | "comment" | "audit";
  action: string;
  note: string | null;
  createdAt: Date;
  actor: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
}

export interface SubmissionDetail {
  id: string;
  status: ApplicationStatus;
  supplierName: string;
  organizationName: string | null;
  entity: {
    id: string;
    name: string;
    code: string;
  };
  geography: {
    id: string;
    name: string;
    code: string;
  };
  submittedAt: Date | null;
  updatedAt: Date;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  submittedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  submissionType: "SUPPLIER" | "INTERNAL" | null;
  data: Record<string, unknown> | null;
  sections: SubmissionSection[];
  attachments: SubmissionAttachment[];
  comments: SubmissionComment[];
  activity: SubmissionActivityEntry[];
  auditLogs: SubmissionActivityEntry[];
}

type ApplicationListRecord = Prisma.ApplicationGetPayload<{
  include: {
    organization: true;
    entity: true;
    geography: true;
    updatedBy: true;
    submittedBy: true;
  };
}>;

type ApplicationDetailRecord = Prisma.ApplicationGetPayload<{
  include: {
    organization: true;
    entity: true;
    geography: true;
    updatedBy: true;
    submittedBy: true;
    formConfig: {
      include: {
        sections: {
          include: { fields: true };
          orderBy: { order: "asc" };
        };
      };
    };
    documents: {
      include: { documentType: true; uploadedBy: true };
      orderBy: { uploadedAt: "desc" };
    };
    comments: {
      include: { author: true };
      orderBy: { createdAt: "desc" };
    };
    auditLogs: {
      include: { actor: true };
      orderBy: { createdAt: "desc" };
      take: 50;
    };
  };
}>;

export async function getSubmissionList(
  params: SubmissionListParams = {}
): Promise<SubmissionListResult> {
  await requireRole(["ADMIN", "PROCUREMENT"]);

  const page = Math.max(1, params.page ?? 1);
  const sortField: SubmissionSortField =
    params.sortField && SORT_FIELDS.includes(params.sortField)
      ? params.sortField
      : "submittedAt";
  const sortDirection: SubmissionSortDirection =
    params.sortDirection === "asc" ? "asc" : "desc";

  const where: Prisma.ApplicationWhereInput = {};

  if (params.entityCodes?.length) {
    where.entity = {
      is: {
        code: { in: params.entityCodes },
      },
    };
  }

  if (params.geographyCodes?.length) {
    where.geography = {
      is: {
        code: { in: params.geographyCodes },
      },
    };
  }

  if (params.statuses?.length) {
    where.status = { in: params.statuses };
  }

  if (params.ownerIds?.length) {
    where.updatedById = { in: params.ownerIds };
  }

  if (params.submittedFrom || params.submittedTo) {
    where.submittedAt = {};
    if (params.submittedFrom) {
      where.submittedAt.gte = params.submittedFrom;
    }
    if (params.submittedTo) {
      where.submittedAt.lte = params.submittedTo;
    }
  }

  if (params.search) {
    where.OR = [
      {
        organization: {
          is: {
            name: {
              contains: params.search,
              mode: "insensitive",
            },
          },
        },
      },
      { id: { contains: params.search } },
      {
        data: {
          path: ["supplierInformation", "supplierName"],
          string_contains: params.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const orderBy = buildOrderBy(sortField, sortDirection);

  const [applications, total, entities, geographies, owners] =
    await Promise.all([
      prisma.application.findMany({
        where,
        orderBy,
        skip: (page - 1) * SUBMISSION_PAGE_SIZE,
        take: SUBMISSION_PAGE_SIZE,
        include: {
          organization: true,
          entity: true,
          geography: true,
          updatedBy: true,
          submittedBy: true,
        },
      }),
      prisma.application.count({ where }),
      prisma.entity.findMany({ orderBy: { name: "asc" } }),
      prisma.geography.findMany({ orderBy: { name: "asc" } }),
      prisma.user.findMany({
        where: {
          memberships: {
            some: {
              role: { in: ["PROCUREMENT", "ADMIN"] },
            },
          },
        },
        select: { id: true, name: true, email: true },
        orderBy: [
          { name: "asc" },
          { email: "asc" },
        ],
        take: 100,
      }),
    ]);

  return {
    data: applications.map(mapApplicationToRow),
    pagination: {
      page,
      pageSize: SUBMISSION_PAGE_SIZE,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / SUBMISSION_PAGE_SIZE)),
    },
    filterMeta: {
      entities: entities.map((entity) => ({
        id: entity.id,
        code: entity.code,
        name: entity.name,
      })),
      geographies: geographies.map((geo) => ({
        id: geo.id,
        code: geo.code,
        name: geo.name,
      })),
      statuses: Object.values(ApplicationStatus),
      owners,
    },
  };
}

export async function getSubmissionDetail(
  id: string
): Promise<SubmissionDetail | null> {
  await requireRole(["ADMIN", "PROCUREMENT"]);

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      organization: true,
      entity: true,
      geography: true,
      updatedBy: true,
      submittedBy: true,
      formConfig: {
        include: {
          sections: {
            include: { fields: true },
            orderBy: { order: "asc" },
          },
        },
      },
      documents: {
        include: { documentType: true, uploadedBy: true },
        orderBy: { uploadedAt: "desc" },
      },
      comments: {
        include: { author: true },
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!application) {
    return null;
  }

  const sections = buildSections(application);
  const attachments = await buildAttachments(application);
  const comments = application.comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    visibility: comment.visibility,
    createdAt: comment.createdAt,
    author: comment.author
      ? {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
        }
      : null,
  }));

  const auditLogs = application.auditLogs.map((log) => ({
    id: log.id,
    type: "audit" as const,
    action: log.action,
    note:
      log.details && typeof log.details === "object" && "note" in log.details
        ? String(log.details.note ?? "")
        : null,
    createdAt: log.createdAt,
    actor: log.actor
      ? {
          id: log.actor.id,
          name: log.actor.name,
          email: log.actor.email,
        }
      : null,
  }));

  const activity: SubmissionActivityEntry[] = [...auditLogs];

  comments.forEach((comment) => {
    activity.push({
      id: `comment_${comment.id}`,
      type: "comment",
      action:
        comment.visibility === "supplier_visible"
          ? "SUPPLIER_COMMENT"
          : "INTERNAL_COMMENT",
      note: comment.body,
      createdAt: comment.createdAt,
      actor: comment.author,
    });
  });

  activity.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return {
    id: application.id,
    status: application.status,
    supplierName: deriveSupplierName(application),
    organizationName: application.organization?.name ?? null,
    entity: {
      id: application.entity.id,
      name: application.entity.name,
      code: application.entity.code,
    },
    geography: {
      id: application.geography.id,
      name: application.geography.name,
      code: application.geography.code,
    },
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    owner: application.updatedBy
      ? {
          id: application.updatedBy.id,
          name: application.updatedBy.name,
          email: application.updatedBy.email,
        }
      : null,
    submittedBy: application.submittedBy
      ? {
          id: application.submittedBy.id,
          name: application.submittedBy.name,
          email: application.submittedBy.email,
        }
      : null,
    submissionType: application.submissionType as "SUPPLIER" | "INTERNAL" | null,
    data: (application.data as Record<string, unknown> | null) ?? null,
    sections,
    attachments,
    comments,
    activity,
    auditLogs,
  };
}

function mapApplicationToRow(application: ApplicationListRecord): SubmissionRow {
  return {
    id: application.id,
    supplierName: deriveSupplierName(application),
    organizationName: application.organization?.name ?? null,
    entity: {
      id: application.entity.id,
      name: application.entity.name,
      code: application.entity.code,
    },
    geography: {
      id: application.geography.id,
      name: application.geography.name,
      code: application.geography.code,
    },
    status: application.status,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    owner: application.updatedBy
      ? {
          id: application.updatedBy.id,
          name: application.updatedBy.name,
          email: application.updatedBy.email,
        }
      : null,
    submittedBy: application.submittedBy
      ? {
          id: application.submittedBy.id,
          name: application.submittedBy.name,
          email: application.submittedBy.email,
        }
      : null,
    submissionType: application.submissionType as "SUPPLIER" | "INTERNAL" | null,
  };
}

function deriveSupplierName(
  application: Pick<ApplicationListRecord, "organization" | "data">
): string {
  const data = (application.data as Record<string, unknown> | null) ?? null;
  const fromForm = getValueAtPath(data, [
    "supplierInformation",
    "supplierName",
  ]);

  if (typeof fromForm === "string" && fromForm.trim()) {
    return fromForm.trim();
  }

  return application.organization?.name ?? "Unknown supplier";
}

function buildOrderBy(
  field: SubmissionSortField,
  direction: SubmissionSortDirection
): Prisma.ApplicationOrderByWithRelationInput[] {
  const sortOrder = direction === "asc" ? "asc" : "desc";

  switch (field) {
    case "updatedAt":
      return [{ updatedAt: sortOrder }, { createdAt: "desc" }];
    case "status":
      return [{ status: sortOrder }, { submittedAt: "desc" }, { createdAt: "desc" }];
    case "supplier":
      return [
        { organization: { name: sortOrder } },
        { submittedAt: "desc" },
        { createdAt: "desc" },
      ];
    case "entity":
      return [
        { entity: { name: sortOrder } },
        { submittedAt: "desc" },
        { createdAt: "desc" },
      ];
    case "geography":
      return [
        { geography: { name: sortOrder } },
        { submittedAt: "desc" },
        { createdAt: "desc" },
      ];
    case "submittedAt":
    default:
      return [{ submittedAt: sortOrder }, { createdAt: "desc" }];
  }
}

function buildSections(application: ApplicationDetailRecord): SubmissionSection[] {
  const sections = application.formConfig?.sections ?? [];
  const data = (application.data as Record<string, unknown> | null) ?? null;

  return sections.map((section) => ({
    id: section.id,
    key: section.key,
    label: section.label,
    order: section.order,
    fields: section.fields
      .sort((a, b) => a.order - b.order)
      .map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        helpText: field.helpText ?? null,
        options: field.options ?? null,
        isSensitive: field.isSensitive,
        value: resolveFieldValue(data, section.key, field.key),
      })),
  }));
}

async function buildAttachments(
  application: ApplicationDetailRecord
): Promise<SubmissionAttachment[]> {
  return Promise.all(
    application.documents.map(async (doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType ?? null,
      fileSize: doc.fileSize ?? null,
      uploadedAt: doc.uploadedAt,
      previewUrl: await getSignedDocumentUrl(doc.fileUrl),
      type: {
        id: doc.documentTypeId,
        key: doc.documentType?.key ?? null,
        label: doc.documentType?.label ?? doc.documentTypeId,
        category: doc.documentType?.category ?? null,
      },
      uploadedBy: doc.uploadedBy
        ? {
            id: doc.uploadedBy.id,
            name: doc.uploadedBy.name,
            email: doc.uploadedBy.email,
          }
        : null,
    }))
  );
}

function resolveFieldValue(
  data: Record<string, unknown> | null,
  sectionKey: string,
  fieldKey: string
): unknown {
  if (!data) {
    return null;
  }

  const potentialPaths: string[][] = [];

  if (sectionKey) {
    potentialPaths.push([sectionKey, fieldKey]);
  }
  if (fieldKey.includes(".")) {
    potentialPaths.push(fieldKey.split("."));
  }
  potentialPaths.push([fieldKey]);

  for (const path of potentialPaths) {
    const value = getValueAtPath(data, path);
    if (value !== undefined) {
      return value;
    }
  }

  return null;
}

function getValueAtPath(
  data: Record<string, unknown> | null,
  path: string[]
): unknown {
  if (!data) {
    return undefined;
  }

  return path.reduce<unknown>((acc, key) => {
    if (
      acc &&
      typeof acc === "object" &&
      acc !== null &&
      key in (acc as Record<string, unknown>)
    ) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

