import { NextRequest, NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import {
  SORT_FIELDS,
  getSubmissionList,
  type SubmissionListParams,
  type SubmissionListResult,
  type SubmissionSortDirection,
  type SubmissionSortField,
} from "@/lib/procurement/submissions";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = parseQuery(url.searchParams);
    const result = await getSubmissionList(params);
    return NextResponse.json(serializeResult(result));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    const status = message.toLowerCase().includes("unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function parseQuery(searchParams: URLSearchParams): SubmissionListParams {
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const search =
    searchParams.get("search") ?? searchParams.get("q") ?? undefined;
  const entityCodes = parseArray(searchParams, "entity");
  const geographyCodes = parseArray(searchParams, "geography");
  const ownerIds = parseArray(searchParams, "owner");
  const statuses = parseStatuses(parseArray(searchParams, "status"));

  const submittedFrom = parseDate(
    searchParams.get("submitted_from") ?? searchParams.get("submittedFrom")
  );
  const submittedTo = parseDate(
    searchParams.get("submitted_to") ?? searchParams.get("submittedTo")
  );

  const { sortField, sortDirection } = parseSort(searchParams.get("sort"));

  return {
    page,
    search,
    entityCodes,
    geographyCodes,
    ownerIds,
    statuses,
    submittedFrom,
    submittedTo,
    sortField,
    sortDirection,
  };
}

function parseArray(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseStatuses(values: string[]): ApplicationStatus[] {
  const validStatuses = new Set(Object.values(ApplicationStatus));
  return values
    .map((value) => value.toUpperCase())
    .filter((value): value is ApplicationStatus =>
      validStatuses.has(value as ApplicationStatus)
    );
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseSort(
  value: string | null
): {
  sortField?: SubmissionSortField;
  sortDirection?: SubmissionSortDirection;
} {
  if (!value) {
    return {};
  }

  const [field, direction] = value.split(":");
  const normalizedField = field?.trim();
  const sortField = isSortField(normalizedField)
    ? normalizedField
    : undefined;
  const sortDirection =
    direction?.toLowerCase() === "asc" ? ("asc" as const) : ("desc" as const);

  return {
    sortField,
    sortDirection,
  };
}

function isSortField(value?: string | null): value is SubmissionSortField {
  if (!value) {
    return false;
  }
  return SORT_FIELDS.includes(value as SubmissionSortField);
}

function serializeResult(result: SubmissionListResult) {
  return {
    data: result.data.map((row) => ({
      ...row,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
    })),
    pagination: result.pagination,
    filterMeta: result.filterMeta,
  };
}

