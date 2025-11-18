import {
  createInitialFormState,
  hydrateFormState,
  serializeFormState,
  type FormState,
} from "@/lib/forms/form-state";

describe("form-state utilities", () => {
  it("creates an initial state with sane defaults", () => {
    const state = createInitialFormState();

    expect(state.formData).toEqual({});
    expect(state.currentStep).toBe(0);
    expect(state.completedSteps.size).toBe(0);
    expect(state.touched.size).toBe(0);
    expect(state.isDirty).toBe(false);
    expect(state.isSubmitting).toBe(false);
  });

  it("normalizes initial step input and seeds completed steps", () => {
    const state = createInitialFormState({ companyName: "Acme" }, 3.8);

    expect(state.currentStep).toBe(3);
    expect(Array.from(state.completedSteps)).toEqual([0, 1, 2]);
    expect(state.formData).toEqual({ companyName: "Acme" });
  });

  it("serializes form state by flattening sets to arrays", () => {
    const state: FormState = {
      formData: { companyName: "Acme" },
      currentStep: 2,
      errors: { companyName: "Required" },
      touched: new Set(["companyName"]),
      completedSteps: new Set([0, 1]),
      isDirty: true,
      isSubmitting: false,
    };

    const serialized = serializeFormState(state);

    expect(serialized).toMatchObject({
      formData: { companyName: "Acme" },
      errors: { companyName: "Required" },
      touched: ["companyName"],
      completedSteps: [0, 1],
      isDirty: true,
      currentStep: 2,
      isSubmitting: false,
    });
  });

  it("hydrates a serialized snapshot back into runtime-friendly structures", () => {
    const hydrated = hydrateFormState({
      formData: { email: "hello@example.com" },
      errors: {},
      touched: ["email"],
      completedSteps: [0],
      currentStep: 1,
      isDirty: true,
      isSubmitting: true,
    });

    expect(hydrated.formData).toEqual({ email: "hello@example.com" });
    expect(hydrated.touched).toBeInstanceOf(Set);
    expect(Array.from(hydrated.touched)).toEqual(["email"]);
    expect(Array.from(hydrated.completedSteps)).toEqual([0]);
    expect(hydrated.isDirty).toBe(true);
    expect(hydrated.isSubmitting).toBe(true);
  });

  it("falls back to defaults when snapshot is partial", () => {
    const hydrated = hydrateFormState({});

    expect(hydrated.currentStep).toBe(0);
    expect(hydrated.formData).toEqual({});
    expect(hydrated.touched.size).toBe(0);
    expect(hydrated.completedSteps.size).toBe(0);
    expect(hydrated.isDirty).toBe(false);
  });
});


