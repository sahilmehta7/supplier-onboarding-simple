const transitions: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["IN_REVIEW"],
  IN_REVIEW: ["PENDING_SUPPLIER", "APPROVED", "REJECTED"],
  PENDING_SUPPLIER: ["IN_REVIEW"],
  APPROVED: [],
  REJECTED: [],
};

export function canTransition(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}

export const nextActions = [
  { label: "Start review", value: "IN_REVIEW" },
  { label: "Request clarification", value: "PENDING_SUPPLIER" },
  { label: "Approve", value: "APPROVED" },
  { label: "Reject", value: "REJECTED" },
];

