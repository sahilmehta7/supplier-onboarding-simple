"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormConfigWithFields } from "@/lib/forms/types";
import { getStepFieldKeys } from "@/lib/forms/form-validator";
import { buildFormSchema } from "@/lib/form-schema";
import { saveFormDraft, type DraftSaveResult } from "@/app/forms/actions";
import { StepIndicator } from "./step-indicator";
import { FormStep } from "./form-step";
import { FormNavigation } from "./form-navigation";
import { FormErrorSummary } from "./form-error-summary";
import { useFormState } from "@/hooks/use-form-state";
import { useAutosave } from "@/hooks/use-autosave";
import { useToast } from "@/components/ui/use-toast";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { useFieldVisibility } from "@/hooks/use-field-visibility";
import { useSectionVisibility } from "@/hooks/use-section-visibility";

interface DynamicFormWizardProps {
  formConfig: FormConfigWithFields;
  initialData?: Record<string, unknown>;
  initialStep?: number;
  applicationId: string | null;
  organizationId: string;
  onApplicationIdChange?: (applicationId: string) => void;
  onDraftSaved?: (result: DraftSaveResult) => void;
  onStepChange?: (stepIndex: number) => void;
  onComplete?: (payload: {
    formData: Record<string, unknown>;
    hiddenSections: string[];
  }) => Promise<void> | void;
}

const clampStep = (step: number, totalSteps: number) => {
  if (totalSteps <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(step, totalSteps - 1));
};

export function DynamicFormWizard({
  formConfig,
  initialData = {},
  initialStep = 0,
  applicationId,
  organizationId,
  onApplicationIdChange,
  onDraftSaved,
  onStepChange,
  onComplete,
}: DynamicFormWizardProps) {
  const sortedSections = useMemo(
    () => [...formConfig.sections].sort((a, b) => a.order - b.order),
    [formConfig.sections]
  );

  const allFields = useMemo(
    () => sortedSections.flatMap((section) => section.fields),
    [sortedSections]
  );

  const totalSections = sortedSections.length;
  const safeInitialStep = clampStep(initialStep ?? 0, totalSections);

  const {
    state,
    touchedMap,
    setFieldValue,
    markFieldTouched,
    markFieldsTouched,
    setFieldError,
    setStepErrors,
    goToStep,
    markStepComplete,
    setIsSubmitting,
    markClean,
    resetForm,
    validateAndCommitStep,
  } = useFormState({
    formConfig,
    initialData,
    initialStep: safeInitialStep,
  });

  const sectionVisibilityMap = useSectionVisibility(
    sortedSections,
    state.formData
  );

  const rawFieldVisibilityMap = useFieldVisibility(
    allFields,
    state.formData
  );

  const visibilityMap = useMemo(() => {
    const nextMap = { ...rawFieldVisibilityMap };
    sortedSections.forEach((section) => {
      const isSectionVisible = sectionVisibilityMap[section.id] ?? true;
      if (!isSectionVisible) {
        section.fields.forEach((field) => {
          nextMap[field.key] = false;
        });
      }
    });
    return nextMap;
  }, [rawFieldVisibilityMap, sectionVisibilityMap, sortedSections]);

  const visibleSectionIndices = useMemo(() => {
    return sortedSections.reduce<number[]>((indices, section, index) => {
      if (sectionVisibilityMap[section.id] ?? true) {
        indices.push(index);
      }
      return indices;
    }, []);
  }, [sortedSections, sectionVisibilityMap]);

  const visibleSections = visibleSectionIndices.map(
    (sectionIndex) => sortedSections[sectionIndex]
  );

  const hasVisibleSections = visibleSectionIndices.length > 0;
  const firstVisibleIndex = visibleSectionIndices[0] ?? null;
  const lastVisibleIndex =
    visibleSectionIndices[visibleSectionIndices.length - 1] ?? null;
  const currentVisibleIndex = visibleSectionIndices.indexOf(
    state.currentStep
  );
  const normalizedVisibleIndex =
    currentVisibleIndex === -1 ? 0 : currentVisibleIndex;
  const isFirstVisibleStep =
    !hasVisibleSections ||
    (firstVisibleIndex !== null && state.currentStep === firstVisibleIndex);
  const isLastVisibleStep =
    hasVisibleSections &&
    lastVisibleIndex !== null &&
    state.currentStep === lastVisibleIndex;

  const visibleCompletedSteps = useMemo(() => {
    const completed = new Set<number>();
    visibleSectionIndices.forEach((sectionIndex, visibleIndex) => {
      if (state.completedSteps.has(sectionIndex)) {
        completed.add(visibleIndex);
      }
    });
    return completed;
  }, [state.completedSteps, visibleSectionIndices]);

  const hiddenSectionKeys = useMemo(() => {
    return sortedSections
      .filter((section) => !(sectionVisibilityMap[section.id] ?? true))
      .map((section) => section.key);
  }, [sectionVisibilityMap, sortedSections]);

  const findNextVisibleStep = useCallback(
    (fromIndex: number) => {
      for (const index of visibleSectionIndices) {
        if (index > fromIndex) {
          return index;
        }
      }
      return null;
    },
    [visibleSectionIndices]
  );

  const findPreviousVisibleStep = useCallback(
    (fromIndex: number) => {
      for (let i = visibleSectionIndices.length - 1; i >= 0; i -= 1) {
        const index = visibleSectionIndices[i];
        if (index < fromIndex) {
          return index;
        }
      }
      return null;
    },
    [visibleSectionIndices]
  );

  useEffect(() => {
    if (!hasVisibleSections) {
      return;
    }
    if (!visibleSectionIndices.includes(state.currentStep)) {
      const fallback =
        visibleSectionIndices.find((index) => index > state.currentStep) ??
        visibleSectionIndices[0];
      if (typeof fallback === "number") {
        goToStep(fallback);
        onStepChange?.(fallback);
      }
    }
  }, [
    goToStep,
    hasVisibleSections,
    onStepChange,
    state.currentStep,
    visibleSectionIndices,
  ]);

  const [liveMessage, setLiveMessage] = useState("");
  const validationTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const formSchemaRef = useRef(buildFormSchema(formConfig));
  const prefersReducedMotion = usePrefersReducedMotion();
  const { toast } = useToast();
  const initialSnapshotRef = useRef(
    JSON.stringify({ data: initialData, step: safeInitialStep, applicationId })
  );

  const currentSection =
    sortedSections[state.currentStep] ??
    (visibleSectionIndices.length > 0
      ? sortedSections[visibleSectionIndices[0]]
      : null);

  useEffect(() => {
    formSchemaRef.current = buildFormSchema(formConfig);
  }, [formConfig]);

  useEffect(() => {
    const nextSnapshot = JSON.stringify({
      data: initialData,
      step: safeInitialStep,
      applicationId,
    });

    if (nextSnapshot !== initialSnapshotRef.current) {
      resetForm(initialData, safeInitialStep);
      initialSnapshotRef.current = nextSnapshot;
    }
  }, [initialData, resetForm, safeInitialStep, applicationId]);

  const focusFirstError = useCallback(
    (fieldKey?: string) => {
      if (!fieldKey || !currentSection) {
        return;
      }

      const isVisible = visibilityMap[fieldKey] ?? true;
      if (!isVisible) {
        return;
      }

      const errorField = currentSection.fields.find((field) => field.key === fieldKey);
      const fieldElement = errorField
        ? document.getElementById(`field-${errorField.id}`)
        : null;
      fieldElement?.focus();
      fieldElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [currentSection, visibilityMap]
  );

  const validateField = useCallback(
    (fieldKey: string, value: unknown, immediate = false) => {
      if (validationTimersRef.current[fieldKey]) {
        clearTimeout(validationTimersRef.current[fieldKey]);
      }

      const performValidation = () => {
        const fieldSchema = formSchemaRef.current.shape[fieldKey];
        if (!fieldSchema) {
          return;
        }

        try {
          fieldSchema.parse(value);
          setFieldError(fieldKey);
        } catch (error) {
          if (error && typeof error === "object" && "issues" in error) {
            const zodError = error as { issues: Array<{ message: string }> };
            const firstIssue = zodError.issues[0];
            if (firstIssue) {
              setFieldError(fieldKey, firstIssue.message);
            }
          } else if (error instanceof Error) {
            setFieldError(fieldKey, error.message);
          }
        }
      };

      if (immediate) {
        performValidation();
      } else {
        validationTimersRef.current[fieldKey] = setTimeout(performValidation, 300);
      }
    },
    [setFieldError]
  );

  const handleFieldChange = useCallback(
    (fieldKey: string, value: unknown) => {
      setFieldValue(fieldKey, value);
      if (state.touched.has(fieldKey)) {
        validateField(fieldKey, value, false);
      }
    },
    [setFieldValue, state.touched, validateField]
  );

  const handleFieldBlur = useCallback(
    (fieldKey: string) => {
      markFieldTouched(fieldKey);
      validateField(fieldKey, state.formData[fieldKey], true);
    },
    [markFieldTouched, state.formData, validateField]
  );

  const autosaveFingerprint = useMemo(
    () =>
      JSON.stringify({
        data: state.formData,
        step: state.currentStep,
        hidden: hiddenSectionKeys,
      }),
    [hiddenSectionKeys, state.formData, state.currentStep]
  );

  const runDraftSave = useCallback(() => {
    return saveFormDraft({
      formConfigId: formConfig.id,
      organizationId,
      entityId: formConfig.entityId,
      geographyId: formConfig.geographyId,
      applicationId,
      formData: state.formData,
      currentStep: state.currentStep,
      hiddenSections: hiddenSectionKeys,
    });
  }, [
    applicationId,
    formConfig.entityId,
    formConfig.geographyId,
    formConfig.id,
    hiddenSectionKeys,
    organizationId,
    state.currentStep,
    state.formData,
  ]);

  const {
    status: draftStatus,
    isSaving: isSavingDraft,
    lastSavedAt,
    error: draftError,
    triggerSave,
  } = useAutosave<DraftSaveResult>({
    shouldAutosave: state.isDirty,
    dataFingerprint: autosaveFingerprint,
    save: runDraftSave,
    onSuccess: (result) => {
      markClean();
      if (result.applicationId && result.applicationId !== applicationId) {
        onApplicationIdChange?.(result.applicationId);
      }
      onDraftSaved?.(result);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Draft save failed",
        description: error.message,
      });
    },
  });

  const handleNext = useCallback(async () => {
    if (state.isSubmitting) {
      return;
    }

    if (!hasVisibleSections) {
      toast({
        variant: "destructive",
        title: "No sections available",
        description:
          "Based on your answers, no sections apply right now. Please contact support to continue.",
      });
      return;
    }

    const validation = validateAndCommitStep(state.currentStep, {
      visibilityMap,
    });
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Please fix validation errors",
        description: "Resolve highlighted fields before continuing.",
      });
      focusFirstError(validation.firstErrorField);
      return;
    }

    markStepComplete(state.currentStep);

    if (isLastVisibleStep && onComplete) {
      try {
        setIsSubmitting(true);
        await onComplete({
          formData: state.formData,
          hiddenSections: hiddenSectionKeys,
        });
        toast({
          title: "Form submitted",
          description: "Thank you! We received your information.",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while submitting. Please try again.",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const nextStep = findNextVisibleStep(state.currentStep);
    if (nextStep !== null) {
      goToStep(nextStep);
      onStepChange?.(nextStep);
      void triggerSave("step-change");
    }
  }, [
    findNextVisibleStep,
    focusFirstError,
    goToStep,
    hasVisibleSections,
    hiddenSectionKeys,
    isLastVisibleStep,
    markStepComplete,
    onComplete,
    onStepChange,
    setIsSubmitting,
    state.currentStep,
    state.formData,
    state.isSubmitting,
    toast,
    triggerSave,
    validateAndCommitStep,
    visibilityMap,
  ]);

  const handlePrevious = useCallback(() => {
    if (!hasVisibleSections) {
      return;
    }
    const prevStep = findPreviousVisibleStep(state.currentStep);
    if (prevStep === null) {
      return;
    }
    goToStep(prevStep);
    onStepChange?.(prevStep);
  }, [
    findPreviousVisibleStep,
    goToStep,
    hasVisibleSections,
    onStepChange,
    state.currentStep,
  ]);

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      if (!hasVisibleSections || stepIndex === state.currentStep) {
        return;
      }

      const validation = validateAndCommitStep(state.currentStep, {
        visibilityMap,
      });
      if (!validation.isValid) {
        toast({
          variant: "destructive",
          title: "Cannot leave step yet",
          description: "Fix validation errors before moving on.",
        });
        focusFirstError(validation.firstErrorField);
        return;
      }

      const isTargetVisible = visibleSectionIndices.includes(stepIndex);
      if (!isTargetVisible) {
        return;
      }

      const nextStep = findNextVisibleStep(state.currentStep);
      const canNavigate =
        state.completedSteps.has(stepIndex) ||
        (nextStep !== null && nextStep === stepIndex);

      if (!canNavigate) {
        return;
      }

      goToStep(stepIndex);
      onStepChange?.(stepIndex);
      void triggerSave("step-change");
    },
    [
      findNextVisibleStep,
      focusFirstError,
      goToStep,
      hasVisibleSections,
      onStepChange,
      state.completedSteps,
      state.currentStep,
      toast,
      triggerSave,
      validateAndCommitStep,
      visibleSectionIndices,
      visibilityMap,
    ]
  );

  const handleVisibleStepClick = useCallback(
    (visibleIndex: number) => {
      const targetStep = visibleSectionIndices[visibleIndex];
      if (typeof targetStep === "number") {
        handleStepClick(targetStep);
      }
    },
    [handleStepClick, visibleSectionIndices]
  );

  const handleManualSave = useCallback(() => {
    void triggerSave("manual");
  }, [triggerSave]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in inputs, textareas, or selects
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + Arrow Right or Ctrl/Cmd + N = Next step
      if ((event.ctrlKey || event.metaKey) && (event.key === "ArrowRight" || event.key === "n" || event.key === "N")) {
        event.preventDefault();
        if (!isLastVisibleStep && hasVisibleSections) {
          handleNext();
        }
      }

      // Ctrl/Cmd + Arrow Left or Ctrl/Cmd + P = Previous step
      if ((event.ctrlKey || event.metaKey) && (event.key === "ArrowLeft" || event.key === "p" || event.key === "P")) {
        event.preventDefault();
        if (!isFirstVisibleStep && hasVisibleSections) {
          handlePrevious();
        }
      }

      // Ctrl/Cmd + S = Save draft
      if ((event.ctrlKey || event.metaKey) && (event.key === "s" || event.key === "S")) {
        event.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFirstVisibleStep, isLastVisibleStep, hasVisibleSections, handleNext, handlePrevious, handleManualSave]);

  useEffect(() => {
    const timers = validationTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  useEffect(() => {
    if (!hasVisibleSections) {
      setLiveMessage(
        "All sections are hidden based on your previous answers. Please contact support."
      );
      return;
    }
    const sectionLabel =
      currentSection?.label ?? `Step ${normalizedVisibleIndex + 1}`;
    setLiveMessage(
      `Now viewing ${sectionLabel} (${normalizedVisibleIndex + 1} of ${visibleSectionIndices.length})`
    );
  }, [
    currentSection,
    hasVisibleSections,
    normalizedVisibleIndex,
    visibleSectionIndices,
  ]);

  const progress = hasVisibleSections
    ? ((normalizedVisibleIndex + 1) / visibleSectionIndices.length) * 100
    : 0;

  return (
    <div className="flex flex-col gap-4 pb-32 sm:pb-12">
      {hasVisibleSections && (
        <StepIndicator
          steps={visibleSections.map((section) => ({
            id: section.id,
            label: section.label,
            order: section.order,
          }))}
          currentStep={normalizedVisibleIndex}
          completedSteps={visibleCompletedSteps}
          onStepClick={handleVisibleStepClick}
        />
      )}

      <div className="min-h-[400px] space-y-6 py-4">
        {hasVisibleSections ? (
          <>
            {(() => {
              const stepFieldKeys = getStepFieldKeys(
                state.currentStep,
                formConfig
              ).filter((fieldKey) => visibilityMap[fieldKey] ?? true);
              const stepErrors: Record<string, string> = {};
              stepFieldKeys.forEach((key) => {
                if (state.errors[key] && touchedMap[key]) {
                  stepErrors[key] = state.errors[key];
                }
              });

              if (Object.keys(stepErrors).length > 0) {
                return (
                  <FormErrorSummary
                    errors={stepErrors}
                    onErrorClick={(fieldKey) => focusFirstError(fieldKey)}
                  />
                );
              }
              return null;
            })()}

            {currentSection && (
              <FormStep
                section={currentSection}
                formData={state.formData}
                errors={state.errors}
                touched={touchedMap}
                visibilityMap={visibilityMap}
                onFieldChange={handleFieldChange}
                onFieldBlur={handleFieldBlur}
                applicationId={applicationId}
              />
            )}
          </>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center space-y-2 text-center text-sm text-muted-foreground">
            <p>All sections are currently hidden based on your answers.</p>
            <p className="text-xs text-slate-500">
              Please contact your procurement representative if you believe this is a mistake.
            </p>
          </div>
        )}
      </div>

      {hasVisibleSections && (
        <FormNavigation
          isFirstStep={isFirstVisibleStep}
          isLastStep={isLastVisibleStep}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSaveDraft={handleManualSave}
          progress={progress}
          isSubmitting={state.isSubmitting}
          isSavingDraft={isSavingDraft}
          draftStatus={draftStatus}
          draftError={draftError}
          lastSavedAt={lastSavedAt}
        />
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </p>
    </div>
  );
}
