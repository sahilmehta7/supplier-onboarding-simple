/**
 * Hook for field-level validation with debouncing and timing control
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { z } from "zod";
import type { FieldValidationResult } from "@/lib/forms/form-validator";
import { validateField } from "@/lib/forms/form-validator";

export interface UseFieldValidationOptions {
  /**
   * Schema to validate against
   */
  schema: z.ZodSchema;
  /**
   * Initial value
   */
  initialValue?: unknown;
  /**
   * Whether to validate on mount
   */
  validateOnMount?: boolean;
  /**
   * Debounce delay in milliseconds for onChange validation
   */
  debounceMs?: number;
  /**
   * Whether to validate on change (with debounce)
   */
  validateOnChange?: boolean;
  /**
   * Whether to validate on blur
   */
  validateOnBlur?: boolean;
}

export interface UseFieldValidationReturn {
  /**
   * Current validation result
   */
  validation: FieldValidationResult;
  /**
   * Validate the field with a new value
   */
  validate: (value: unknown) => void;
  /**
   * Clear validation errors
   */
  clearError: () => void;
  /**
   * Whether validation is currently running (debounced)
   */
  isValidating: boolean;
}

/**
 * Hook for field-level validation
 */
export function useFieldValidation({
  schema,
  initialValue,
  validateOnMount = false,
  debounceMs = 300,
  validateOnChange = true,
  validateOnBlur = true,
}: UseFieldValidationOptions): UseFieldValidationReturn {
  const [validation, setValidation] = useState<FieldValidationResult>({
    isValid: true,
  });
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidatedValueRef = useRef<unknown>(initialValue);

  const performValidation = useCallback(
    (value: unknown) => {
      // Skip validation if value hasn't changed
      if (value === lastValidatedValueRef.current) {
        return;
      }

      setIsValidating(true);
      const result = validateField("", value, schema);
      setValidation(result);
      lastValidatedValueRef.current = value;
      setIsValidating(false);
    },
    [schema]
  );

  const validate = useCallback(
    (value: unknown) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (validateOnChange) {
        setIsValidating(true);
        debounceTimerRef.current = setTimeout(() => {
          performValidation(value);
        }, debounceMs);
      } else {
        performValidation(value);
      }
    },
    [performValidation, validateOnChange, debounceMs]
  );

  const clearError = useCallback(() => {
    setValidation({ isValid: true });
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsValidating(false);
  }, []);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount && initialValue !== undefined) {
      performValidation(initialValue);
    }
  }, [validateOnMount, initialValue, performValidation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    validation,
    validate,
    clearError,
    isValidating,
  };
}

