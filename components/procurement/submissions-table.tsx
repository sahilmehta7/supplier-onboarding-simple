import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  SubmissionRow,
  SubmissionSortDirection,
  SubmissionSortField,
} from "@/lib/procurement/submissions";
import { SortToggle } from "@/components/procurement/sort-toggle";
import { SubmissionSourceBadge } from "@/components/procurement/submission-source-badge";

interface SubmissionsTableProps {
  rows: SubmissionRow[];
  sortField: SubmissionSortField;
  sortDirection: SubmissionSortDirection;
}

export function SubmissionsTable({
  rows,
  sortField,
  sortDirection,
}: SubmissionsTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white text-left text-[11px] uppercase tracking-[0.3em] text-slate-500 shadow-sm">
            <tr>
              <th className="px-6 py-4">
                <SortToggle
                  field="supplier"
                  label="Supplier"
                  activeField={sortField}
                  activeDirection={sortDirection}
                />
              </th>
              <th className="px-6 py-4">
                <SortToggle
                  field="entity"
                  label="Entity"
                  activeField={sortField}
                  activeDirection={sortDirection}
                />
              </th>
              <th className="px-6 py-4">
                <SortToggle
                  field="geography"
                  label="Geography"
                  activeField={sortField}
                  activeDirection={sortDirection}
                />
              </th>
              <th className="px-6 py-4">
                <SortToggle
                  field="status"
                  label="Status"
                  activeField={sortField}
                  activeDirection={sortDirection}
                />
              </th>
              <th className="px-6 py-4">
                <SortToggle
                  field="submittedAt"
                  label="Submitted"
                  activeField={sortField}
                  activeDirection={sortDirection}
                />
              </th>
              <th className="px-6 py-4">Submitted By</th>
              <th className="px-6 py-4">
                <SortToggle
                  field="updatedAt"
                  label="Last Updated"
                  activeField={sortField}
                  activeDirection={sortDirection}
                />
              </th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No submissions match the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {row.supplierName}
                      </span>
                      <span className="text-xs text-slate-500">
                        #{row.id.slice(0, 6).toUpperCase()}{" "}
                        {row.organizationName ? `• ${row.organizationName}` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {row.entity.name} ({row.entity.code})
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {row.geography.name} ({row.geography.code})
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary" className="rounded-full">
                      {formatStatus(row.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(row.submittedAt)}
                  </td>
                  <td className="px-6 py-4">
                    <SubmissionSourceBadge
                      submissionType={row.submissionType}
                      submittedBy={row.submittedBy}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(row.updatedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {row.owner?.name ?? row.owner?.email ?? "Unassigned"}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/dashboard/procurement/${row.id}`}
                      className="font-semibold text-slate-900 underline underline-offset-4"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

