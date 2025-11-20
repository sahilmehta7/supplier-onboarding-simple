"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQueryStates } from "nuqs";
import { procurementClientParsers } from "@/app/dashboard/procurement/search-params-client";
import { Button } from "@/components/ui/button";

const paginationParsers = {
  page: procurementClientParsers.page,
};

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
}: PaginationControlsProps) {
  const [, setPagination] = useQueryStates(paginationParsers, {
    history: "replace",
    shallow: false,
  });

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    void setPagination({ page: safePage });
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm md:flex-row md:items-center md:justify-between">
      <span>
        Showing {startItem}-{endItem} of {totalItems} submissions
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

