"use client";

import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { useQueryStates } from "nuqs";
import { procurementClientParsers } from "@/app/dashboard/procurement/search-params-client";
import type {
  SubmissionSortDirection,
  SubmissionSortField,
} from "@/lib/procurement/submissions";
import { cn } from "@/lib/utils";

const sortParsers = {
  sort: procurementClientParsers.sort,
  page: procurementClientParsers.page,
};

interface SortToggleProps {
  field: SubmissionSortField;
  label: string;
  activeField: SubmissionSortField;
  activeDirection: SubmissionSortDirection;
}

export function SortToggle({
  field,
  label,
  activeField,
  activeDirection,
}: SortToggleProps) {
  const [, setSortState] = useQueryStates(sortParsers, {
    history: "replace",
    shallow: false,
  });

  const isActive = activeField === field;
  const nextDirection =
    isActive && activeDirection === "desc" ? "asc" : "desc";

  const handleClick = () => {
    void setSortState({
      sort: `${field}:${nextDirection}`,
      page: 1,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.2em]",
        isActive ? "text-slate-900" : "text-slate-500"
      )}
    >
      <span>{label}</span>
      {isActive ? (
        activeDirection === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
      )}
    </button>
  );
}

