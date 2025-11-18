import Link from "next/link";
import { ApplicationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type ProcurementSearchParams = {
  q?: string;
  status?: string;
  entity?: string;
  page?: string;
};

interface ProcurementDashboardProps {
  searchParams?: ProcurementSearchParams | Promise<ProcurementSearchParams>;
}

const PAGE_SIZE = 10;
const statusOptions = [
  "SUBMITTED",
  "IN_REVIEW",
  "PENDING_SUPPLIER",
  "APPROVED",
  "REJECTED",
];

export default async function ProcurementDashboard({
  searchParams,
}: ProcurementDashboardProps) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const statusFilter = statusOptions.includes(params.status ?? "")
    ? (params.status as ApplicationStatus)
    : undefined;
  const entityFilter = params.entity;
  const page = Number(params.page ?? "1") || 1;

  const where: Prisma.ApplicationWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(entityFilter ? { entity: { is: { code: entityFilter } } } : {}),
    ...(query
      ? {
          OR: [
            {
              organization: {
                is: { name: { contains: query, mode: "insensitive" } },
              },
            },
            { id: { contains: query } },
          ],
        }
      : {}),
  };

  const [applications, total, entities, recentAuditLogs] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      include: {
        organization: true,
        entity: true,
        geography: true,
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.application.count({ where }),
    prisma.entity.findMany({ orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        application: {
          select: { id: true, organization: { select: { name: true } } },
        },
      },
      take: 5,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildPageHref = (targetPage: number) => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, value);
      }
    });
    urlParams.set("page", String(targetPage));
    return `/dashboard/procurement?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Procurement workspace
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Review queue
        </h1>
        <p className="text-sm text-slate-500">
          Monitor submissions, filter by entity or status, and jump into detail
          views.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" method="get">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">
                Search
              </label>
              <input
                name="q"
                defaultValue={query}
                placeholder="Org name or application id"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">
                Status
              </label>
              <select
                name="status"
                defaultValue={statusFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">
                Entity
              </label>
              <select
                name="entity"
                defaultValue={entityFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">All entities</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.code}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Apply filters
              </button>
              <Link
                href="/dashboard/procurement"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900"
              >
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">
            Results ({total} application{total === 1 ? "" : "s"})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {applications.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No applications match the selected filters.
            </p>
          ) : (
            applications.map((application) => (
              <div
                key={application.id}
                className="space-y-3 rounded-xl border border-slate-100 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {application.organization?.name ?? "Unknown org"}
                    </p>
                    <p className="text-xs text-slate-500">
                      #{application.id.slice(0, 6).toUpperCase()} •{" "}
                      {application.entity?.name} • {application.geography?.code}
                    </p>
                  </div>
                  <Badge variant="secondary">{application.status}</Badge>
                </div>
                <div className="grid gap-4 text-xs text-slate-500 md:grid-cols-4">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">Submitted</p>
                    <p>
                      {application.submittedAt
                        ? new Date(application.submittedAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      Last updated
                    </p>
                    <p>{new Date(application.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      Reviewer
                    </p>
                    <p>{application.updatedById ?? "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">SLA</p>
                    <p>Due in 3 days</p>
                  </div>
                </div>
                <Separator />
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Last action:{" "}
                    {application.status === "PENDING_SUPPLIER"
                      ? "Waiting for supplier clarification"
                      : "Awaiting review"}
                  </div>
                  <a
                    href={`/dashboard/procurement/${application.id}`}
                    className="text-xs font-semibold text-slate-900 underline underline-offset-4"
                  >
                    Open detail view
                  </a>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Latest audit events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {recentAuditLogs.length === 0 ? (
            <p>No recent activity.</p>
          ) : (
            recentAuditLogs.map((log) => {
              const note =
                log.details &&
                typeof log.details === "object" &&
                "note" in log.details
                  ? String(
                      (log.details as { note?: unknown }).note ?? ""
                    ).trim()
                  : "";
              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{log.action}</span>
                  </div>
                  <p className="text-slate-900">
                    {log.application?.organization?.name ?? "Unknown org"} • #
                    {log.application?.id.slice(0, 6).toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {note || "No additional detail"}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <a
            href={buildPageHref(Math.max(1, page - 1))}
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-900"
          >
            Prev
          </a>
          <a
            href={buildPageHref(Math.min(totalPages, page + 1))}
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-900"
          >
            Next
          </a>
        </div>
      </div>
    </div>
  );
}

