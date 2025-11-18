"use client";

import { useTransition } from "react";
import {
  claimApplicationAction,
  transitionApplicationAction,
} from "@/app/dashboard/procurement/[id]/actions";
import { nextActions } from "@/lib/application-state";

interface ActionPanelProps {
  applicationId: string;
  currentStatus: string;
}

export function ProcurementActionPanel({
  applicationId,
  currentStatus,
}: ActionPanelProps) {
  const [isPending, startTransition] = useTransition();

  const handleTransition = (target: string) => {
    startTransition(async () => {
      await transitionApplicationAction({
        applicationId,
        targetStatus: target as
          | "IN_REVIEW"
          | "PENDING_SUPPLIER"
          | "APPROVED"
          | "REJECTED",
      });
    });
  };

  const handleClaim = () => {
    startTransition(async () => {
      await claimApplicationAction(applicationId);
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
        Actions
      </p>
      <button
        type="button"
        onClick={handleClaim}
        disabled={isPending}
        className="w-full rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-900"
      >
        Claim application
      </button>
      <div className="grid gap-2 sm:grid-cols-2">
        {nextActions
          .filter((action) => action.value !== currentStatus)
          .map((action) => (
            <button
              key={action.value}
              type="button"
              onClick={() => handleTransition(action.value)}
              disabled={isPending}
              className="rounded-full bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
      </div>
      <p className="text-xs text-slate-500">
        Actions enforce the SUBMITTED → IN_REVIEW → (PENDING_SUPPLIER | APPROVED
        | REJECTED) workflow.
      </p>
    </div>
  );
}

