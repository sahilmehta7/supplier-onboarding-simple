"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type {
  VisibilityConfig,
  VisibilityMatchMode,
  VisibilityRule,
} from "@/lib/forms/types";
import {
  VISIBILITY_CONDITIONS,
  VISIBILITY_CONDITION_METADATA,
  formatVisibilitySummary,
} from "@/lib/forms/visibility-format";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface VisibilityFieldOption {
  key: string;
  label: string;
}

interface VisibilityRuleBuilderProps {
  fields: VisibilityFieldOption[];
  value: VisibilityConfig | null;
  onChange: (config: VisibilityConfig | null) => void;
  disabled?: boolean;
  emptyStateMessage?: string;
}

const DEFAULT_RULE: VisibilityRule = {
  dependsOn: "",
  condition: "equals",
  value: "",
};

export function VisibilityRuleBuilder({
  fields,
  value,
  onChange,
  disabled,
  emptyStateMessage = "Define at least one field before adding conditional logic.",
}: VisibilityRuleBuilderProps) {
  const [matchMode, setMatchMode] = useState<VisibilityMatchMode>("all");

  useEffect(() => {
    if (value?.match) {
      setMatchMode(value.match);
    }
  }, [value]);

  const rules = value?.rules ?? [];
  const hasFields = fields.length > 0;

  const handleMatchChange = (mode: VisibilityMatchMode) => {
    setMatchMode(mode);
    if (value) {
      onChange({ ...value, match: mode });
    }
  };

  const handleRuleChange = (index: number, partial: Partial<VisibilityRule>) => {
    const nextRules = rules.map((rule, idx) =>
      idx === index ? { ...rule, ...partial } : rule
    );
    onChange({ match: matchMode, rules: nextRules });
  };

  const handleRemoveRule = (index: number) => {
    const nextRules = rules.filter((_, idx) => idx !== index);
    if (nextRules.length === 0) {
      onChange(null);
      return;
    }
    onChange({ match: matchMode, rules: nextRules });
  };

  const handleAddRule = () => {
    if (!hasFields) {
      return;
    }
    const defaultField = fields[0]?.key ?? "";
    const nextRule: VisibilityRule = {
      ...DEFAULT_RULE,
      dependsOn: defaultField,
    };
    const nextRules = [...rules, nextRule];
    onChange({ match: matchMode, rules: nextRules });
  };

  const currentMatch = value?.match ?? matchMode;

  const getFieldLabel = useCallback(
    (key: string) => {
      return fields.find((field) => field.key === key)?.label ?? key;
    },
    [fields]
  );

  const summary = useMemo(() => {
    if (!value || !value.rules || value.rules.length === 0) {
      return null;
    }
    return formatVisibilitySummary(value, {
      getFieldLabel,
    });
  }, [value, getFieldLabel]);

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Conditional visibility
          </p>
          <p className="text-xs text-slate-500">
            Show this section only when the rules below match.
          </p>
        </div>
        {value && (
          <Badge variant="secondary" className="text-xs uppercase tracking-wide">
            {value.match === "all" ? "All rules" : "Any rule"}
          </Badge>
        )}
      </div>

      {!hasFields && (
        <p className="text-sm text-amber-600">{emptyStateMessage}</p>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Match mode
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={currentMatch === "all" ? "default" : "outline"}
              disabled={disabled}
              onClick={() => handleMatchChange("all")}
            >
              All rules
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentMatch === "any" ? "default" : "outline"}
              disabled={disabled}
              onClick={() => handleMatchChange("any")}
            >
              Any rule
            </Button>
          </div>
        </div>

        {rules.length > 0 && (
          <div className="space-y-3">
            {rules.map((rule, index) => {
              const conditionMeta = VISIBILITY_CONDITION_METADATA[rule.condition];
              const requiresValue = conditionMeta?.requiresValue ?? true;
              return (
                <div
                  key={`${rule.dependsOn}-${index}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-end"
                >
                  <label className="flex-1 text-xs font-semibold text-slate-500">
                    Field
                    <Select
                      value={rule.dependsOn}
                      onValueChange={(next) =>
                        handleRuleChange(index, { dependsOn: next })
                      }
                      disabled={disabled || !hasFields}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="flex-1 text-xs font-semibold text-slate-500">
                    Condition
                    <Select
                      value={rule.condition}
                      onValueChange={(next) => {
                        const meta =
                          VISIBILITY_CONDITION_METADATA[
                          next as VisibilityRule["condition"]
                          ];
                        handleRuleChange(index, {
                          condition: next as VisibilityRule["condition"],
                          value: meta?.requiresValue ? rule.value ?? "" : null,
                        });
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_CONDITIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  {requiresValue && (
                    <label className="flex-1 text-xs font-semibold text-slate-500">
                      Value
                      <Input
                        className="mt-1"
                        value={String(rule.value ?? "")}
                        onChange={(event) =>
                          handleRuleChange(index, {
                            value: event.target.value,
                          })
                        }
                        disabled={disabled}
                        placeholder="Enter value"
                      />
                    </label>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "self-start text-slate-500 transition hover:text-red-600",
                      requiresValue ? "" : "sm:self-end"
                    )}
                    onClick={() => handleRemoveRule(index)}
                    disabled={disabled}
                    aria-label="Remove rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {summary ? (
          <p className="text-xs text-slate-500">
            Visible when {summary}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Add at least one rule to enable conditional visibility.
          </p>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-2"
          onClick={handleAddRule}
          disabled={disabled || !hasFields}
        >
          <Plus className="h-3.5 w-3.5" />
          Add rule
        </Button>
      </div>
    </div>
  );
}

