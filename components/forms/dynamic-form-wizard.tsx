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

interface DynamicFormWizardProps {
  formConfig: FormConfigWithFields;
  initialData?: Record<string, unknown>;
  initialStep?: number;
  applicationId: string | null;
  organizationId: string;
  onApplicationIdChange?: (applicationId: string) => void;
  onDraftSaved?: (result: DraftSaveResult) => void;
  onStepChange?: (stepIndex: number) => void;
  onComplete?: (formData: Record<string, unknown>) => Promise<void> | void;
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

  const totalSteps = sortedSections.length;
  const safeInitialStep = clampStep(initialStep ?? 0, totalSteps);

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

  const [liveMessage, setLiveMessage] = useState("");
  const validationTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const formSchemaRef = useRef(buildFormSchema(formConfig));
  const prefersReducedMotion = usePrefersReducedMotion();
  const { toast } = useToast();
  const initialSnapshotRef = useRef(
    JSON.stringify({ data: initialData, step: safeInitialStep, applicationId })
  );

  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === totalSteps - 1;
  const currentSection = sortedSections[state.currentStep];
  const visibilityMap = useFieldVisibility(allFields, state.formData);

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
    () => JSON.stringify({ data: state.formData, step: state.currentStep }),
    [state.formData, state.currentStep]
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
    });
  }, [
    applicationId,
    formConfig.entityId,
    formConfig.geographyId,
    formConfig.id,
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

    if (isLastStep && onComplete) {
      try {
        setIsSubmitting(true);
        await onComplete(state.formData);
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

    const nextStep = clampStep(state.currentStep + 1, totalSteps);
    goToStep(nextStep);
    onStepChange?.(nextStep);
    void triggerSave("step-change");
  }, [
    focusFirstError,
    goToStep,
    isLastStep,
    markStepComplete,
    onComplete,
    onStepChange,
    setIsSubmitting,
    state.currentStep,
    state.formData,
    state.isSubmitting,
    toast,
    totalSteps,
    triggerSave,
    validateAndCommitStep,
    visibilityMap,
  ]);

  const handlePrevious = useCallback(() => {
    if (isFirstStep) {
      return;
    }
    const prevStep = clampStep(state.currentStep - 1, totalSteps);
    goToStep(prevStep);
    onStepChange?.(prevStep);
  }, [goToStep, isFirstStep, onStepChange, state.currentStep, totalSteps]);

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      if (stepIndex === state.currentStep) {
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

      if (
        state.completedSteps.has(stepIndex) ||
        stepIndex === clampStep(state.currentStep + 1, totalSteps)
      ) {
        const nextStep = clampStep(stepIndex, totalSteps);
        goToStep(nextStep);
        onStepChange?.(nextStep);
        void triggerSave("step-change");
      }
    },
    [
      focusFirstError,
      goToStep,
      onStepChange,
      state.completedSteps,
      state.currentStep,
      toast,
      totalSteps,
      triggerSave,
      validateAndCommitStep,
      visibilityMap,
    ]
  );

  const handleManualSave = useCallback(() => {
    void triggerSave("manual");
  }, [triggerSave]);

  useEffect(() => {
    const timers = validationTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  useEffect(() => {
    const sectionLabel = currentSection?.label ?? `Step ${state.currentStep + 1}`;
    setLiveMessage(
      `Now viewing ${sectionLabel} (${state.currentStep + 1} of ${totalSteps})`
    );
  }, [currentSection, state.currentStep, totalSteps]);

  const progress =
    totalSteps > 0 ? ((state.currentStep + 1) / totalSteps) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 pb-32 sm:pb-12">
      <StepIndicator
        steps={sortedSections.map((section) => ({
          id: section.id,
          label: section.label,
          order: section.order,
        }))}
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
        onStepClick={handleStepClick}
      />

      <div
        className={cn(
          "min-h-[400px] space-y-6 rounded-3xl border border-border/60 bg-background/70 p-4 shadow-lg sm:p-8",
          !prefersReducedMotion && "transition-shadow duration-300"
        )}
      >
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
      </div>

      <FormNavigation
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
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
      <p role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </p>
    </div>
  );
}
