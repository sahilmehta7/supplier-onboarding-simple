"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { FormConfigWithFields } from "@/lib/forms/types";
import {
  createInitialFormState,
  type FormState,
} from "@/lib/forms/form-state";
import {
  getStepFieldKeys,
  validateStep,
  type StepValidationResult,
  type ValidateStepOptions,
} from "@/lib/forms/form-validator";

type FormStateAction =
  | { type: "SET_FIELD_VALUE"; fieldKey: string; value: unknown }
  | { type: "MARK_TOUCHED"; fieldKey: string }
  | { type: "MARK_TOUCHED_FIELDS"; fieldKeys: string[] }
  | { type: "SET_STEP_ERRORS"; fieldKeys: string[]; errors: Record<string, string> }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "SET_FIELD_ERROR"; fieldKey: string; error?: string }
  | { type: "SET_CURRENT_STEP"; step: number }
  | { type: "MARK_STEP_COMPLETE"; step: number }
  | { type: "SET_SUBMITTING"; value: boolean }
  | { type: "SET_DIRTY"; value: boolean }
  | { type: "RESET"; state: FormState };

function reducer(state: FormState, action: FormStateAction): FormState {
  switch (action.type) {
    case "SET_FIELD_VALUE": {
      const nextValue = action.value;
      const hasChanged = state.formData[action.fieldKey] !== nextValue;
      if (!hasChanged) {
        return state;
      }

      return {
        ...state,
        formData: {
          ...state.formData,
          [action.fieldKey]: nextValue,
        },
        isDirty: true,
      };
    }
    case "SET_FIELD_ERROR": {
      const nextErrors = { ...state.errors };
      if (!action.error) {
        delete nextErrors[action.fieldKey];
      } else {
        nextErrors[action.fieldKey] = action.error;
      }
      return {
        ...state,
        errors: nextErrors,
      };
    }
    case "MARK_TOUCHED": {
      if (state.touched.has(action.fieldKey)) {
        return state;
      }
      const touched = new Set(state.touched);
      touched.add(action.fieldKey);
      return {
        ...state,
        touched,
      };
    }
    case "MARK_TOUCHED_FIELDS": {
      if (action.fieldKeys.length === 0) {
        return state;
      }
      const touched = new Set(state.touched);
      let modified = false;
      action.fieldKeys.forEach((key) => {
        if (!touched.has(key)) {
          touched.add(key);
          modified = true;
        }
      });
      if (!modified) {
        return state;
      }
      return {
        ...state,
        touched,
      };
    }
    case "SET_STEP_ERRORS": {
      const nextErrors = { ...state.errors };
      const fieldSet = new Set(action.fieldKeys);

      // Remove stale errors for this step
      fieldSet.forEach((fieldKey) => {
        if (!(fieldKey in action.errors)) {
          delete nextErrors[fieldKey];
        }
      });

      // Apply new errors
      Object.entries(action.errors).forEach(([fieldKey, message]) => {
        nextErrors[fieldKey] = message;
      });

      return {
        ...state,
        errors: nextErrors,
      };
    }
    case "SET_ERRORS": {
      return {
        ...state,
        errors: action.errors,
      };
    }
    case "SET_CURRENT_STEP": {
      if (state.currentStep === action.step) {
        return state;
      }
      return {
        ...state,
        currentStep: action.step,
      };
    }
    case "MARK_STEP_COMPLETE": {
      if (state.completedSteps.has(action.step)) {
        return state;
      }
      const completedSteps = new Set(state.completedSteps);
      completedSteps.add(action.step);
      return {
        ...state,
        completedSteps,
      };
    }
    case "SET_SUBMITTING": {
      if (state.isSubmitting === action.value) {
        return state;
      }
      return {
        ...state,
        isSubmitting: action.value,
      };
    }
    case "SET_DIRTY": {
      if (state.isDirty === action.value) {
        return state;
      }
      return {
        ...state,
        isDirty: action.value,
      };
    }
    case "RESET": {
      return action.state;
    }
    default:
      return state;
  }
}

export interface UseFormStateOptions {
  formConfig: FormConfigWithFields;
  initialData?: Record<string, unknown>;
  initialStep?: number;
}

export interface UseFormStateReturn {
  state: FormState;
  touchedMap: Record<string, boolean>;
  setFieldValue: (fieldKey: string, value: unknown) => void;
  markFieldTouched: (fieldKey: string) => void;
  markFieldsTouched: (fieldKeys: string[]) => void;
  setStepErrors: (fieldKeys: string[], errors: Record<string, string>) => void;
  setErrors: (errors: Record<string, string>) => void;
  setFieldError: (fieldKey: string, error?: string) => void;
  goToStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  setIsSubmitting: (value: boolean) => void;
  markClean: () => void;
  resetForm: (nextData?: Record<string, unknown>, nextStep?: number) => void;
  validateStepAt: (
    stepIndex: number,
    options?: ValidateStepOptions
  ) => StepValidationResult & { fieldKeys: string[] };
  validateAndCommitStep: (
    stepIndex: number,
    options?: ValidateStepOptions
  ) => StepValidationResult & { fieldKeys: string[] };
}

export function useFormState({
  formConfig,
  initialData,
  initialStep = 0,
}: UseFormStateOptions): UseFormStateReturn {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => createInitialFormState(initialData ?? {}, initialStep)
  );

  const touchedMap = useMemo(() => {
    const result: Record<string, boolean> = {};
    state.touched.forEach((key) => {
      result[key] = true;
    });
    return result;
  }, [state.touched]);

  const setFieldValue = useCallback((fieldKey: string, value: unknown) => {
    dispatch({ type: "SET_FIELD_VALUE", fieldKey, value });
  }, []);

  const markFieldTouched = useCallback((fieldKey: string) => {
    dispatch({ type: "MARK_TOUCHED", fieldKey });
  }, []);

  const markFieldsTouched = useCallback((fieldKeys: string[]) => {
    dispatch({ type: "MARK_TOUCHED_FIELDS", fieldKeys });
  }, []);

  const setStepErrors = useCallback(
    (fieldKeys: string[], errors: Record<string, string>) => {
      dispatch({
        type: "SET_STEP_ERRORS",
        fieldKeys,
        errors,
      });
    },
    []
  );

  const setErrors = useCallback((errors: Record<string, string>) => {
    dispatch({ type: "SET_ERRORS", errors });
  }, []);

  const setFieldError = useCallback((fieldKey: string, error?: string) => {
    dispatch({ type: "SET_FIELD_ERROR", fieldKey, error });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "SET_CURRENT_STEP", step });
  }, []);

  const markStepComplete = useCallback((step: number) => {
    dispatch({ type: "MARK_STEP_COMPLETE", step });
  }, []);

  const setIsSubmitting = useCallback((value: boolean) => {
    dispatch({ type: "SET_SUBMITTING", value });
  }, []);

  const markClean = useCallback(() => {
    dispatch({ type: "SET_DIRTY", value: false });
  }, []);

  const resetForm = useCallback(
    (nextData: Record<string, unknown> = {}, nextStep = 0) => {
      dispatch({
        type: "RESET",
        state: createInitialFormState(nextData, nextStep),
      });
    },
    []
  );

  const validateStepAt = useCallback(
    (stepIndex: number, options?: ValidateStepOptions) => {
      const result = validateStep(stepIndex, state.formData, formConfig, options);
      const fieldKeys = getStepFieldKeys(stepIndex, formConfig).filter(
        (fieldKey) => options?.visibilityMap?.[fieldKey] ?? true
      );
      return {
        ...result,
        fieldKeys,
      };
    },
    [formConfig, state.formData]
  );

  const validateAndCommitStep = useCallback(
    (stepIndex: number, options?: ValidateStepOptions) => {
      const validation = validateStepAt(stepIndex, options);
      markFieldsTouched(validation.fieldKeys);
      setStepErrors(validation.fieldKeys, validation.errors);
      return validation;
    },
    [markFieldsTouched, setStepErrors, validateStepAt]
  );

  return {
    state,
    touchedMap,
    setFieldValue,
    markFieldTouched,
    markFieldsTouched,
    setStepErrors,
    setErrors,
    setFieldError,
    goToStep,
    markStepComplete,
    setIsSubmitting,
    markClean,
    resetForm,
    validateStepAt,
    validateAndCommitStep,
  };
}

