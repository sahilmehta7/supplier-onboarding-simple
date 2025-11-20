import { ApplicationStatus } from "@prisma/client";
import {
  getSubmissionList,
  type SubmissionSortDirection,
  type SubmissionSortField,
} from "@/lib/procurement/submissions";
import { SubmissionFilters } from "@/components/procurement/submission-filters";
import { SubmissionsTable } from "@/components/procurement/submissions-table";
import { PaginationControls } from "@/components/procurement/pagination-controls";
import { procurementSearchParamsCache } from "./search-params";

interface ProcurementDashboardProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function ProcurementDashboard({
  searchParams,
}: ProcurementDashboardProps) {
  const parsed = procurementSearchParamsCache.parse(searchParams ?? {});
  const sort = parseSort(parsed.sort ?? "submittedAt:desc");
  const searchQuery = parsed.search?.trim() || undefined;

  const submissionResult = await getSubmissionList({
    page: parsed.page ?? 1,
    search: searchQuery,
    entityCodes: nonEmptyArray(parsed.entity),
    geographyCodes: nonEmptyArray(parsed.geography),
    ownerIds: nonEmptyArray(parsed.owner),
    statuses: sanitizeStatuses(parsed.status),
    submittedFrom: toDate(parsed.submittedFrom),
    submittedTo: toDate(parsed.submittedTo),
    sortField: sort.field,
    sortDirection: sort.direction,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Supplier submissions
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Review workspace
        </h1>
        <p className="text-sm text-slate-500">
          Filter, search, and sort every supplier submission in a single table.
        </p>
      </div>

      <SubmissionFilters meta={submissionResult.filterMeta} />

      <SubmissionsTable
        rows={submissionResult.data}
        sortField={sort.field}
        sortDirection={sort.direction}
      />

      <PaginationControls
        currentPage={submissionResult.pagination.page}
        totalPages={submissionResult.pagination.totalPages}
        pageSize={submissionResult.pagination.pageSize}
        totalItems={submissionResult.pagination.totalItems}
      />
    </div>
  );
}

function nonEmptyArray(values?: string[] | null) {
  if (!values || values.length === 0) {
    return undefined;
  }
  return values;
}

function sanitizeStatuses(statuses?: string[] | null) {
  if (!statuses) {
    return undefined;
  }
  const valid = new Set(Object.values(ApplicationStatus));
  const filtered = statuses.filter((status): status is ApplicationStatus =>
    valid.has(status as ApplicationStatus)
  );
  return filtered.length > 0 ? filtered : undefined;
}

function toDate(value?: string | null) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseSort(sortValue: string): {
  field: SubmissionSortField;
  direction: SubmissionSortDirection;
} {
  const [field, direction] = sortValue.split(":");
  const normalizedField = isSortField(field) ? field : "submittedAt";
  const normalizedDirection =
    direction?.toLowerCase() === "asc" ? "asc" : "desc";
  return {
    field: normalizedField,
    direction: normalizedDirection,
  };
}

function isSortField(value?: string): value is SubmissionSortField {
  return (
    value === "submittedAt" ||
    value === "updatedAt" ||
    value === "status" ||
    value === "supplier" ||
    value === "entity" ||
    value === "geography"
  );
}

