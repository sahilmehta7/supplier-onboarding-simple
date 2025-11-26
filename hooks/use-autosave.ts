"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";
export type AutosaveReason = "debounce" | "step-change" | "manual";

export interface UseAutosaveOptions<TResult> {
  /**
   * When true, autosave timers will run. Typically tied to `isDirty`.
   */
  shouldAutosave: boolean;
  /**
   * Unique string representing the data that should trigger autosave.
   * Commonly a JSON string of the form data.
   */
  dataFingerprint: string;
  /**
   * Debounce delay in milliseconds before triggering autosave.
   */
  debounceMs?: number;
  /**
   * Called to persist the draft. Should throw on failure.
   */
  save: () => Promise<TResult>;
  /**
   * Optional callback invoked when a save succeeds.
   */
  onSuccess?: (result: TResult) => void;
  /**
   * Optional callback invoked when a save fails.
   */
  onError?: (error: Error) => void;
  /**
   * Whether to show a browser prompt on unload when unsaved changes exist.
   */
  warnOnUnload?: boolean;
}

export interface UseAutosaveReturn<TResult> {
  status: AutosaveStatus;
  isSaving: boolean;
  lastSavedAt?: string;
  error?: string;
  triggerSave: (reason?: AutosaveReason) => Promise<TResult | null>;
}

export function useAutosave<TResult>({
  shouldAutosave,
  dataFingerprint,
  debounceMs = 2000,
  save,
  onSuccess,
  onError,
  warnOnUnload = true,
}: UseAutosaveOptions<TResult>): UseAutosaveReturn<TResult> {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const [isSaving, startSaving] = useTransition();

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFingerprintRef = useRef<string>(dataFingerprint);
  const lastSuccessfulFingerprintRef = useRef<string | null>(null);

  const clearTimer = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const performSave = useCallback(
    async (reason: AutosaveReason) => {
      clearTimer();
      setStatus("saving");
      setError(undefined);

      return new Promise<TResult | null>((resolve) => {
        startSaving(async () => {
          // Retry configuration
          const maxRetries = 3;
          let attempt = 0;
          let delay = 1000; // Start with 1 second

          while (attempt < maxRetries) {
            try {
              const result = await save();
              lastSuccessfulFingerprintRef.current = dataFingerprint;
              setStatus("saved");
              setLastSavedAt(new Date().toISOString());
              onSuccess?.(result);
              resolve(result);
              return;
            } catch (err) {
              attempt++;
              const isLastAttempt = attempt >= maxRetries;

              // Check if error is retryable (network errors, timeouts, etc.)
              const isRetryable =
                err instanceof TypeError ||
                (err instanceof Error &&
                  (err.message.includes("fetch") ||
                    err.message.includes("network") ||
                    err.message.includes("timeout")));

              if (!isRetryable || isLastAttempt) {
                // Non-retryable error or final attempt failed
                console.error(
                  `[autosave] Failed to save draft after ${attempt} attempt(s) (${reason})`,
                  err
                );
                setStatus("error");
                const message =
                  err instanceof Error ? err.message : "Failed to save draft";
                setError(
                  `${message}${attempt > 1 ? ` (after ${attempt} attempts)` : ""}`
                );
                onError?.(err instanceof Error ? err : new Error(message));
                resolve(null);
                return;
              }

              // Wait before retrying (exponential backoff)
              console.warn(
                `[autosave] Save attempt ${attempt} failed, retrying in ${delay}ms...`,
                err
              );
              await new Promise((r) => setTimeout(r, delay));
              delay = Math.min(delay * 2, 10000); // Cap at 10 seconds
            }
          }
        });
      });
    },
    [dataFingerprint, onError, onSuccess, save]
  );

  const triggerSave = useCallback(
    async (reason: AutosaveReason = "manual") => {
      return performSave(reason);
    },
    [performSave]
  );

  useEffect(() => {
    if (!shouldAutosave) {
      clearTimer();
      return;
    }

    if (dataFingerprint === lastSuccessfulFingerprintRef.current) {
      lastFingerprintRef.current = dataFingerprint;
      return;
    }

    if (dataFingerprint === lastFingerprintRef.current) {
      return;
    }

    lastFingerprintRef.current = dataFingerprint;
    clearTimer();
    debounceTimerRef.current = setTimeout(() => {
      void triggerSave("debounce");
    }, debounceMs);

    return clearTimer;
  }, [dataFingerprint, debounceMs, shouldAutosave, triggerSave]);

  useEffect(() => {
    if (!warnOnUnload) {
      return;
    }

    const handler = (event: BeforeUnloadEvent) => {
      if (!shouldAutosave) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [shouldAutosave, warnOnUnload]);

  return {
    status,
    isSaving,
    lastSavedAt,
    error,
    triggerSave,
  };
}

