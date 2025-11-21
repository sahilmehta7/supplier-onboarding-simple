import type { VisibilityConfig, VisibilityRule } from "@/lib/forms/types";

export interface VisibilityConditionMeta {
  label: string;
  requiresValue: boolean;
}

export const VISIBILITY_CONDITION_METADATA: Record<
  VisibilityRule["condition"],
  VisibilityConditionMeta
> = {
  equals: { label: "Equals", requiresValue: true },
  notEquals: { label: "Does not equal", requiresValue: true },
  contains: { label: "Contains", requiresValue: true },
  greaterThan: { label: "Greater than", requiresValue: true },
  lessThan: { label: "Less than", requiresValue: true },
  isEmpty: { label: "Is empty", requiresValue: false },
  isNotEmpty: { label: "Is not empty", requiresValue: false },
};

export const VISIBILITY_CONDITIONS: Array<
  VisibilityConditionMeta & { value: VisibilityRule["condition"] }
> = Object.entries(VISIBILITY_CONDITION_METADATA).map(([value, meta]) => ({
  value: value as VisibilityRule["condition"],
  ...meta,
}));

interface FormatVisibilitySummaryOptions {
  getFieldLabel?: (key: string) => string;
  joiners?: {
    all?: string;
    any?: string;
  };
}

export function formatVisibilitySummary(
  config: VisibilityConfig,
  options: FormatVisibilitySummaryOptions = {}
): string {
  // Safety check: ensure rules array exists
  if (!config.rules || config.rules.length === 0) {
    return "";
  }

  const getFieldLabel =
    options.getFieldLabel ?? ((key: string) => key);
  const joinAll = options.joiners?.all ?? " • ";
  const joinAny = options.joiners?.any ?? " OR ";

  const statements = config.rules.map((rule) => {
    const meta = VISIBILITY_CONDITION_METADATA[rule.condition];
    const conditionLabel = meta?.label ?? rule.condition;
    if (meta?.requiresValue) {
      return `${getFieldLabel(rule.dependsOn)} ${conditionLabel.toLowerCase()} "${rule.value ?? ""
        }"`;
    }
    return `${getFieldLabel(rule.dependsOn)} ${conditionLabel.toLowerCase()}`;
  });

  return config.match === "all"
    ? statements.join(joinAll)
    : statements.join(joinAny);
}

