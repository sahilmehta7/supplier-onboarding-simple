"use client";

import { useCallback, useState, useTransition } from "react";
import {
  loadFormDraft,
  deleteFormDraft,
  submitFormApplication,
  type DraftSaveResult,
} from "@/app/forms/actions";
import type { DraftSummary } from "@/lib/forms/draft-manager";
import type { FormConfigWithFields } from "@/lib/forms/types";
import { useToast } from "@/components/ui/use-toast";
import { DraftResumeDialog } from "./draft-resume-dialog";
import { DynamicFormWizard } from "./dynamic-form-wizard";

interface FormWizardClientProps {
  formConfig: FormConfigWithFields;
  organizationId: string;
  initialData?: Record<string, unknown>;
  initialStep?: number;
  initialApplicationId?: string | null;
  drafts?: DraftSummary[];
}

export function FormWizardClient({
  formConfig,
  organizationId,
  initialData = {},
  initialStep = 0,
  initialApplicationId = null,
  drafts: initialDrafts = [],
}: FormWizardClientProps) {
  const { toast } = useToast();
  const [applicationId, setApplicationId] = useState<string | null>(
    initialApplicationId
  );
  const [seedData, setSeedData] = useState<Record<string, unknown>>(initialData);
  const [seedStep, setSeedStep] = useState<number>(initialStep);
  const [drafts, setDrafts] = useState<DraftSummary[]>(initialDrafts);
  const [isPending, startTransition] = useTransition();

  const totalSteps = formConfig.sections.length;

  const handleApplicationIdChange = useCallback((nextId: string) => {
    setApplicationId(nextId);
  }, []);

  const handleDraftSaved = useCallback(
    (result: DraftSaveResult) => {
      const summary: DraftSummary = {
        applicationId: result.applicationId,
        formConfigId: formConfig.id,
        title: formConfig.title ?? "Untitled Form",
        currentStep: result.currentStep ?? 0,
        lastSavedAt: result.updatedAt,
        totalSteps,
      };

      setDrafts((prev) => {
        const filtered = prev.filter(
          (draft) => draft.applicationId !== summary.applicationId
        );
        return [summary, ...filtered];
      });
    },
    [formConfig.id, formConfig.title, totalSteps]
  );

  const resetToBlank = useCallback(() => {
    setSeedData({});
    setSeedStep(0);
    setApplicationId(null);
  }, []);

  const handleSelectDraft = useCallback(
    async (selectedId: string | null) => {
      if (!selectedId) {
        resetToBlank();
        return;
      }

      await new Promise<void>((resolve, reject) => {
        startTransition(() => {
          loadFormDraft({
            applicationId: selectedId,
            organizationId,
          })
            .then((draft) => {
              if (!draft) {
                throw new Error("Draft could not be loaded.");
              }
              setApplicationId(draft.applicationId);
              setSeedData(draft.formData ?? {});
              setSeedStep(draft.currentStep ?? 0);
              resolve();
            })
            .catch((error) => {
              toast({
                variant: "destructive",
                title: "Unable to resume draft",
                description:
                  error instanceof Error ? error.message : "Unknown error.",
              });
              reject(error);
            });
        });
      });
    },
    [organizationId, resetToBlank, startTransition, toast]
  );

  const handleDeleteDraft = useCallback(
    async (draftId: string) => {
      await new Promise<void>((resolve, reject) => {
        startTransition(() => {
          deleteFormDraft({
            applicationId: draftId,
            organizationId,
          })
            .then(() => {
              setDrafts((prev) =>
                prev.filter((draft) => draft.applicationId !== draftId)
              );
              if (applicationId === draftId) {
                resetToBlank();
              }
              resolve();
            })
            .catch((error) => {
              toast({
                variant: "destructive",
                title: "Unable to delete draft",
                description:
                  error instanceof Error ? error.message : "Unknown error.",
              });
              reject(error);
            });
        });
      });
    },
    [applicationId, organizationId, resetToBlank, startTransition, toast]
  );

  const handleComplete = useCallback(
    async ({
      formData,
      hiddenSections,
    }: {
      formData: Record<string, unknown>;
      hiddenSections: string[];
    }) => {
      try {
        const result = await submitFormApplication({
          formConfigId: formConfig.id,
          organizationId,
          entityId: formConfig.entityId,
          geographyId: formConfig.geographyId,
          applicationId,
          formData,
          hiddenSections,
        });

        toast({
          title: "Application submitted",
          description: "Thanks! Our team will review your information shortly.",
        });

        setDrafts((prev) =>
          prev.filter((draft) => draft.applicationId !== result.applicationId)
        );
        resetToBlank();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while submitting. Please try again.",
        });
        throw error;
      }
    },
    [
      applicationId,
      formConfig.id,
      formConfig.entityId,
      formConfig.geographyId,
      organizationId,
      resetToBlank,
      toast,
    ]
  );

  return (
    <div className="space-y-4">
      {drafts.length > 0 && (
        <div className="flex justify-end">
          <DraftResumeDialog
            drafts={drafts}
            onSelectDraft={handleSelectDraft}
            onDeleteDraft={handleDeleteDraft}
            triggerLabel={isPending ? "Working…" : "Resume draft"}
          />
        </div>
      )}

      <DynamicFormWizard
        formConfig={formConfig}
        organizationId={organizationId}
        initialData={seedData}
        initialStep={seedStep}
        applicationId={applicationId}
        onApplicationIdChange={handleApplicationIdChange}
        onDraftSaved={handleDraftSaved}
        onComplete={handleComplete}
      />
    </div>
  );
}
