"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DraftSaveIndicator, type DraftStatus } from "./draft-save-indicator";
import { useIsMobile } from "@/hooks/use-mobile";

interface FormNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft?: () => void;
  progress: number;
  isSubmitting?: boolean;
  isSavingDraft?: boolean;
  draftStatus?: DraftStatus;
  draftError?: string | null;
  lastSavedAt?: string | Date | null;
}

export function FormNavigation({
  isFirstStep,
  isLastStep,
  onNext,
  onPrevious,
  onSaveDraft,
  progress,
  isSubmitting = false,
  isSavingDraft = false,
  draftStatus = "idle",
  draftError = null,
  lastSavedAt = null,
}: FormNavigationProps) {
  const isMobile = useIsMobile();
  const containerClass = cn(
    "space-y-4 border border-border/60 bg-card/80 p-4 shadow-lg backdrop-blur-lg transition-all motion-reduce:transition-none",
    isMobile
      ? "fixed bottom-0 left-0 right-0 z-40 w-full rounded-none border-t bg-background/95 px-4 py-4"
      : "rounded-2xl"
  );

  return (
    <div className={containerClass}>
      <Separator className="hidden sm:block" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            className="gap-2"
            disabled={isFirstStep || isSubmitting}
            aria-disabled={isFirstStep || isSubmitting}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </Button>
          {onSaveDraft && (
            <Button
              type="button"
              variant="ghost"
              onClick={onSaveDraft}
              className="gap-2"
              disabled={isSavingDraft || isSubmitting}
              aria-disabled={isSavingDraft || isSubmitting}
            >
              {isSavingDraft ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              {isSavingDraft ? "Saving…" : "Save Draft"}
            </Button>
          )}
        </div>
        <Button
          type="button"
          onClick={onNext}
          className="gap-2"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
        >
          {isLastStep ? (isSubmitting ? "Submitting…" : "Submit") : isSubmitting ? "Validating…" : "Next"}
          {!isLastStep && <ChevronRight className="size-4" aria-hidden="true" />}
        </Button>
      </div>
      {onSaveDraft && (
        <DraftSaveIndicator
          status={draftStatus}
          lastSavedAt={lastSavedAt}
          errorMessage={draftError ?? undefined}
        />
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span aria-live="polite">{Math.round(progress)}%</span>
        </div>
        <Progress
          value={progress}
          aria-hidden={false}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall form progress"
        />
      </div>
    </div>
  );
}

