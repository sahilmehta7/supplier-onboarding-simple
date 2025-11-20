"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryStates } from "nuqs";
import { XIcon, FilterIcon, SearchIcon } from "lucide-react";
import {
  procurementClientParsers,
  type ProcurementClientQueryState,
} from "@/app/dashboard/procurement/search-params-client";
import type { SupplierSubmissionListResponse } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FilterMeta = SupplierSubmissionListResponse["filterMeta"];

type MultiFilterKey = "entity" | "geography" | "status" | "owner";

interface SubmissionFiltersProps {
  meta: FilterMeta;
}

export function SubmissionFilters({ meta }: SubmissionFiltersProps) {
  const [filters, setFilters] = useQueryStates(procurementClientParsers, {
    history: "replace",
    shallow: false,
  });
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  useEffect(() => {
    setSearchInput(filters.search ?? "");
  }, [filters.search]);

  const activeChips = useMemo(() => buildActiveChips(filters, meta), [filters, meta]);
  const hasActiveFilters = activeChips.length > 0;

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void setFilters({
      search: searchInput.trim() ? searchInput.trim() : null,
      page: 1,
    });
  };

  const handleToggle = (key: MultiFilterKey, value: string) => {
    const currentValues = filters[key] ?? [];
    const exists = currentValues.includes(value);
    const nextValues = exists
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    void setFilters({
      [key]: nextValues.length > 0 ? nextValues : null,
      page: 1,
    });
  };

  const handleDateChange = (key: "submittedFrom" | "submittedTo", value: string) => {
    void setFilters({
      [key]: value || null,
      page: 1,
    });
  };

  const handleClearAll = () => {
    setSearchInput("");
    void setFilters({
      search: null,
      entity: null,
      geography: null,
      status: null,
      owner: null,
      submittedFrom: null,
      submittedTo: null,
      page: 1,
    });
  };

  const handleRemoveChip = (chip: ActiveChip) => {
    switch (chip.type) {
      case "search":
        setSearchInput("");
        void setFilters({ search: null, page: 1 });
        break;
      case "submittedFrom":
      case "submittedTo":
        void setFilters({ [chip.type]: null, page: 1 });
        break;
      default: {
        if (!isMultiFilterChip(chip)) {
          break;
        }
        const nextValues =
          (filters[chip.type] ?? []).filter((value) => value !== chip.value) ??
          [];
        void setFilters({
          [chip.type]: nextValues.length > 0 ? nextValues : null,
          page: 1,
        });
      }
    }
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
            <FilterIcon className="h-4 w-4" /> Filters
          </p>
          <CardTitle className="text-base font-semibold">
            Narrow down submissions
          </CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={handleClearAll}
        >
          Clear all
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 md:flex-row md:items-center"
        >
          <label className="flex w-full flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-slate-900">
            <SearchIcon className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search supplier name or application ID"
              className="w-full bg-transparent text-base outline-none"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="rounded-full px-5">
              Apply
            </Button>
            {filters.search && (
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={() => {
                  setSearchInput("");
                  void setFilters({ search: null, page: 1 });
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <CheckboxGroup
            label="Entity"
            options={meta.entities.map((entity) => ({
              value: entity.code,
              label: entity.name,
            }))}
            values={filters.entity ?? []}
            onToggle={(value) => handleToggle("entity", value)}
          />
          <CheckboxGroup
            label="Geography"
            options={meta.geographies.map((geo) => ({
              value: geo.code,
              label: geo.name,
            }))}
            values={filters.geography ?? []}
            onToggle={(value) => handleToggle("geography", value)}
          />
          <CheckboxGroup
            label="Status"
            options={meta.statuses.map((status) => ({
              value: status,
              label: formatStatus(status),
            }))}
            values={filters.status ?? []}
            onToggle={(value) => handleToggle("status", value)}
          />
          <CheckboxGroup
            label="Owner"
            options={meta.owners.map((owner) => ({
              value: owner.id,
              label: owner.name ?? owner.email ?? "Unassigned",
            }))}
            values={filters.owner ?? []}
            onToggle={(value) => handleToggle("owner", value)}
            maxRows={5}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DateInput
            label="Submitted after"
            value={filters.submittedFrom ?? ""}
            onChange={(value) => handleDateChange("submittedFrom", value)}
          />
          <DateInput
            label="Submitted before"
            value={filters.submittedTo ?? ""}
            onChange={(value) => handleDateChange("submittedTo", value)}
          />
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <Badge
                key={`${chip.type}-${chip.value}`}
                variant="secondary"
                className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
              >
                {chip.label}
                <button
                  type="button"
                  className="text-slate-500 transition hover:text-slate-900"
                  onClick={() => handleRemoveChip(chip)}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CheckboxGroupProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  onToggle: (value: string) => void;
}

function CheckboxGroup({
  label,
  options,
  values,
  onToggle,
}: CheckboxGroupProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 space-y-1 rounded-xl border border-slate-200 p-3 text-sm max-h-[180px] overflow-y-auto">
        {options.length === 0 ? (
          <span className="text-slate-400">No options</span>
        ) : (
          options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-slate-700"
            >
              <input
                type="checkbox"
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={values.includes(option.value)}
                onChange={() => onToggle(option.value)}
              />
              <span className="truncate">{option.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function DateInput({ label, value, onChange }: DateInputProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-600">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <input
        type="date"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2"
      />
    </label>
  );
}

type ActiveChip =
  | { type: "search"; label: string; value: string }
  | { type: "submittedFrom" | "submittedTo"; label: string; value: string }
  | { type: MultiFilterKey; label: string; value: string };

function isMultiFilterChip(
  chip: ActiveChip
): chip is Extract<ActiveChip, { type: MultiFilterKey }> {
  return (
    chip.type === "entity" ||
    chip.type === "geography" ||
    chip.type === "status" ||
    chip.type === "owner"
  );
}

function buildActiveChips(
  filters: ProcurementClientQueryState,
  meta: FilterMeta
): ActiveChip[] {
  const chips: ActiveChip[] = [];

  if (filters.search) {
    chips.push({
      type: "search",
      label: `Search: “${filters.search}”`,
      value: filters.search,
    });
  }

  if (filters.submittedFrom) {
    chips.push({
      type: "submittedFrom",
      label: `After ${filters.submittedFrom}`,
      value: filters.submittedFrom,
    });
  }

  if (filters.submittedTo) {
    chips.push({
      type: "submittedTo",
      label: `Before ${filters.submittedTo}`,
      value: filters.submittedTo,
    });
  }

  const entityMap = new Map(meta.entities.map((entity) => [entity.code, entity.name]));
  const geographyMap = new Map(
    meta.geographies.map((geo) => [geo.code, geo.name])
  );
  const ownerMap = new Map(
    meta.owners.map((owner) => [
      owner.id,
      owner.name ?? owner.email ?? "Unassigned",
    ])
  );

  (filters.entity ?? []).forEach((code) =>
    chips.push({
      type: "entity",
      value: code,
      label: entityMap.get(code) ?? code,
    })
  );

  (filters.geography ?? []).forEach((code) =>
    chips.push({
      type: "geography",
      value: code,
      label: geographyMap.get(code) ?? code,
    })
  );

  (filters.status ?? []).forEach((status) =>
    chips.push({
      type: "status",
      value: status,
      label: formatStatus(status),
    })
  );

  (filters.owner ?? []).forEach((ownerId) =>
    chips.push({
      type: "owner",
      value: ownerId,
      label: ownerMap.get(ownerId) ?? "Unknown owner",
    })
  );

  return chips;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

