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

export function getValidTransitions(from: string): string[] {
  return transitions[from] ?? [];
}

export function canApprove(from: string): boolean {
  return canTransition(from, "APPROVED");
}

export function canReject(from: string): boolean {
  return canTransition(from, "REJECTED");
}

export function canRequestInfo(from: string): boolean {
  return canTransition(from, "PENDING_SUPPLIER");
}

export function canStartReview(from: string): boolean {
  return canTransition(from, "IN_REVIEW");
}

export const nextActions = [
  { label: "Start review", value: "IN_REVIEW" },
  { label: "Request clarification", value: "PENDING_SUPPLIER" },
  { label: "Approve", value: "APPROVED" },
  { label: "Reject", value: "REJECTED" },
];

