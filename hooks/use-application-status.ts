"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface UseApplicationStatusOptions {
  applicationId: string;
  currentStatus: string;
  enabled?: boolean;
  pollInterval?: number; // milliseconds, default 5000
  onStatusChange?: (newStatus: string) => void;
}

export function useApplicationStatus({
  applicationId,
  currentStatus,
  enabled = true,
  pollInterval = 5000,
  onStatusChange,
}: UseApplicationStatusOptions) {
  const [status, setStatus] = useState(currentStatus);
  const [isPolling, setIsPolling] = useState(false);
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef(currentStatus);

  useEffect(() => {
    if (!enabled || !applicationId) return;

    // Only poll if status is in a state where it might change
    const pollableStatuses = ["SUBMITTED", "IN_REVIEW", "PENDING_SUPPLIER"];
    if (!pollableStatuses.includes(status)) {
      return;
    }

    setIsPolling(true);

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/applications/${applicationId}/status`);
        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }

        const data = await response.json();
        const newStatus = data.status;

        if (newStatus !== previousStatusRef.current) {
          setStatus(newStatus);
          previousStatusRef.current = newStatus;

          // Notify parent component
          if (onStatusChange) {
            onStatusChange(newStatus);
          }

          // Refresh page data
          router.refresh();
        }
      } catch (error) {
        console.error("Error polling application status:", error);
        // Stop polling on error
        setIsPolling(false);
      }
    };

    // Poll immediately, then set interval
    pollStatus();
    intervalRef.current = setInterval(pollStatus, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsPolling(false);
    };
  }, [
    applicationId,
    status,
    enabled,
    pollInterval,
    router,
    onStatusChange,
  ]);

  return {
    status,
    isPolling,
  };
}

