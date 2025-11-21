import { z } from "zod";

export type ValidatorFunction = (
    value: unknown,
    formData: Record<string, unknown>,
    params: Record<string, unknown>
) => Promise<boolean | string>;

export const VALIDATOR_REGISTRY: Record<string, ValidatorFunction> = {
    MOCK_NAME_CHECK: async (value, formData, params) => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (typeof value !== "string") return true; // Skip if not string

        // Mock logic: Value must start with "Valid"
        if (value.startsWith("Valid")) {
            return true;
        }

        return "Mock validation failed: Value must start with 'Valid'";
    },

    // Future validators will be added here
    // GST_NAME_MATCH: async (value, formData, params) => { ... }
};
