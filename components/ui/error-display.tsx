"use client";

import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getUserFriendlyError, getActionableError } from "@/lib/error-messages";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  error: Error | string;
  context?: {
    action?: string;
    status?: string;
    field?: string;
    [key: string]: unknown;
  };
  className?: string;
  onAction?: () => void;
}

export function ErrorDisplay({
  error,
  context,
  className,
  onAction,
}: ErrorDisplayProps) {
  const router = useRouter();
  const actionable = getActionableError(error, context);

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionable.action === "refresh") {
      router.refresh();
    } else if (actionable.action === "view-existing") {
      // Navigate to existing application
      // This would need to be passed as a prop or determined from context
    }
  };

  return (
    <Alert variant="destructive" className={cn("mb-4", className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{actionable.message}</p>
        {actionable.action && actionable.actionLabel && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAction}
            className="mt-3"
          >
            {actionable.action === "refresh" && (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {actionable.action === "view-existing" && (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            {actionable.actionLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

