"use client";

import { ApplicationStatus } from "@prisma/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface StatusMessageProps {
  status: ApplicationStatus;
}

const statusConfig = {
  SUBMITTED: {
    icon: Info,
    message: "This application has been submitted and is under review. You cannot make changes at this time.",
    variant: "default" as const,
  },
  IN_REVIEW: {
    icon: Info,
    message: "Application under review. No changes allowed.",
    variant: "default" as const,
  },
  APPROVED: {
    icon: CheckCircle2,
    message: "This application has been approved. View your Company Profile to see all details.",
    variant: "default" as const,
  },
  REJECTED: {
    icon: XCircle,
    message: "This application has been rejected. You can create a new application if needed.",
    variant: "destructive" as const,
  },
  PENDING_SUPPLIER: {
    icon: AlertCircle,
    message: "Procurement has requested changes to specific fields. Please update the highlighted fields and resubmit.",
    variant: "default" as const,
  },
};

export function StatusMessage({ status }: StatusMessageProps) {
  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Alert
      variant={config.variant}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <AlertDescription>{config.message}</AlertDescription>
    </Alert>
  );
}

