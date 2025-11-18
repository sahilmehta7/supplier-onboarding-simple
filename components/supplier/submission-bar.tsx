"use client";

import { useTransition } from "react";
import { submitApplicationAction } from "@/app/supplier/onboarding/actions";

interface SubmissionBarProps {
  applicationId: string;
}

export function SubmissionBar({ applicationId }: SubmissionBarProps) {
  const [isSubmitting, startSubmit] = useTransition();
  const handleSubmit = () => {
    startSubmit(async () => {
      await submitApplicationAction(applicationId);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <button
        type="button"
        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit for review"}
      </button>
      <p className="text-xs text-slate-500">
        Submitting locks edits until procurement requests changes.
      </p>
    </div>
  );
}

