export interface FormState {
  formData: Record<string, unknown>;
  touched: Set<string>;
  errors: Record<string, string>;
  currentStep: number;
  completedSteps: Set<number>;
  isDirty: boolean;
  isSubmitting: boolean;
}

export interface SerializedFormState {
  formData: Record<string, unknown>;
  touched: string[];
  errors: Record<string, string>;
  currentStep: number;
  completedSteps: number[];
  isDirty: boolean;
  isSubmitting: boolean;
}

export function createInitialFormState(
  initialData: Record<string, unknown> = {},
  initialStep = 0
): FormState {
  const normalizedStep =
    Number.isFinite(initialStep) && initialStep > 0
      ? Math.floor(initialStep)
      : 0;

  return {
    formData: initialData,
    touched: new Set(),
    errors: {},
    currentStep: normalizedStep,
    completedSteps:
      normalizedStep > 0
        ? new Set(Array.from({ length: normalizedStep }, (_, index) => index))
        : new Set(),
    isDirty: false,
    isSubmitting: false,
  };
}

export function serializeFormState(state: FormState): SerializedFormState {
  return {
    formData: state.formData,
    errors: state.errors,
    currentStep: state.currentStep,
    isDirty: state.isDirty,
    isSubmitting: state.isSubmitting,
    touched: Array.from(state.touched),
    completedSteps: Array.from(state.completedSteps),
  };
}

export function hydrateFormState(
  snapshot: Partial<SerializedFormState>
): FormState {
  return {
    formData: snapshot.formData ?? {},
    errors: snapshot.errors ?? {},
    currentStep: snapshot.currentStep ?? 0,
    isDirty: snapshot.isDirty ?? false,
    isSubmitting: snapshot.isSubmitting ?? false,
    touched: new Set(snapshot.touched ?? []),
    completedSteps: new Set(snapshot.completedSteps ?? []),
  };
}

