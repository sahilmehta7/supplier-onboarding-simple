import { Progress } from "@/components/ui/progress";

interface OnboardingHeaderProps {
  applicationId: string;
  status: string;
  updatedAt: Date;
  progressValue: number;
}

export function OnboardingHeader({
  applicationId,
  status,
  updatedAt,
  progressValue,
}: OnboardingHeaderProps) {
  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Onboarding wizard
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Draft #{applicationId.slice(0, 6).toUpperCase()}
        </h1>
        <p className="text-sm text-slate-500">
          Guided steps for supplier information, banking, and documents. Autosave
          keeps your progress safe.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 md:items-center">
        <div className="rounded-xl border border-slate-100 px-4 py-3 text-sm">
          <p className="text-xs uppercase text-slate-500">Status</p>
          <p className="font-medium text-slate-900">{status}</p>
        </div>
        <div className="rounded-xl border border-slate-100 px-4 py-3 text-sm">
          <p className="text-xs uppercase text-slate-500">Last updated</p>
          <p className="font-medium text-slate-900">
            {updatedAt.toLocaleDateString()}
          </p>
        </div>
        <div className="px-1">
          <p className="text-xs uppercase text-slate-500">
            Completion ({progressValue}%)
          </p>
          <Progress value={progressValue} />
        </div>
      </div>
    </div>
  );
}

