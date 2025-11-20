interface ApiErrorBody {
  error?: string;
}

export async function jsonRequest<TResponse>(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // ignore
  }

  if (!response.ok) {
    const message =
      (payload as ApiErrorBody)?.error ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as TResponse;
}

export interface SupplierSubmissionListRequest {
  page?: number;
  search?: string;
  entityCodes?: string[];
  geographyCodes?: string[];
  statuses?: string[];
  ownerIds?: string[];
  submittedFrom?: string;
  submittedTo?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export interface SupplierSubmissionRow {
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
  status: string;
  submittedAt: string | null;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export interface SupplierSubmissionListResponse {
  data: SupplierSubmissionRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  filterMeta: {
    entities: Array<{ id: string; code: string; name: string }>;
    geographies: Array<{ id: string; code: string; name: string }>;
    statuses: string[];
    owners: Array<{ id: string; name: string | null; email: string | null }>;
  };
}

export async function fetchSupplierSubmissions(
  params: SupplierSubmissionListRequest = {}
) {
  const query = new URLSearchParams();

  if (params.page && params.page > 1) {
    query.set("page", String(params.page));
  }
  if (params.search) {
    query.set("search", params.search);
  }

  appendMulti(query, "entity", params.entityCodes);
  appendMulti(query, "geography", params.geographyCodes);
  appendMulti(query, "status", params.statuses);
  appendMulti(query, "owner", params.ownerIds);

  if (params.submittedFrom) {
    query.set("submitted_from", params.submittedFrom);
  }
  if (params.submittedTo) {
    query.set("submitted_to", params.submittedTo);
  }

  if (params.sortField) {
    const sortDirection = params.sortDirection ?? "desc";
    query.set("sort", `${params.sortField}:${sortDirection}`);
  }

  const searchSegment = query.toString();
  const url =
    "/api/admin/suppliers" + (searchSegment ? `?${searchSegment}` : "");

  return jsonRequest<SupplierSubmissionListResponse>(url);
}

function appendMulti(
  query: URLSearchParams,
  key: string,
  values?: string[]
) {
  if (!values || values.length === 0) {
    return;
  }
  values
    .filter((value) => Boolean(value?.trim()))
    .forEach((value) => query.append(key, value.trim()));
}

