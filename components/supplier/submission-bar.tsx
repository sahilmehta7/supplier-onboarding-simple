"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { submitApplicationAction } from "@/app/supplier/onboarding/actions";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "./status-message";
import { canSubmitApplication } from "@/lib/application-validation";
import { useToast } from "@/components/ui/use-toast";
import { getUserFriendlyError } from "@/lib/error-messages";

interface SubmissionBarProps {
  applicationId: string;
  status: ApplicationStatus;
  version: number;
}

export function SubmissionBar({
  applicationId,
  status,
  version: initialVersion,
}: SubmissionBarProps) {
  const [isSubmitting, startSubmit] = useTransition();
  const [applicationVersion, setApplicationVersion] = useState<number>(initialVersion);
  const router = useRouter();
  const { toast } = useToast();
  const canSubmit = canSubmitApplication(status);

  const handleSubmit = () => {
    startSubmit(async () => {
      try {
        const result = await submitApplicationAction(
          applicationId,
          applicationVersion // Pass current version
        );

        // Update version on success
        if (result.version) {
          setApplicationVersion(result.version);
        }

        router.refresh();
        toast({
          title: "Application submitted",
          description: "Your application has been submitted for review.",
        });
      } catch (error) {
        const friendlyMessage = getUserFriendlyError(error, {
          action: "submit",
          status,
        });

        // Handle version conflicts
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "OPTIMISTIC_LOCK_ERROR"
        ) {
          toast({
            title: "Conflict detected",
            description: friendlyMessage,
            variant: "destructive",
          });
          // Refresh application data
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: friendlyMessage,
            variant: "destructive",
          });
        }
      }
    });
  };

  if (!canSubmit && status !== "REJECTED") {
    return <StatusMessage status={status} />;
  }

  if (status === "REJECTED") {
    return (
      <div className="space-y-3">
        <StatusMessage status={status} />
        <Button
          onClick={() => router.push("/supplier/onboarding/new")}
          variant="default"
        >
          Create New Application
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        size="lg"
      >
        {isSubmitting
          ? "Submitting..."
          : status === "PENDING_SUPPLIER"
          ? "Resubmit for Review"
          : "Submit for Review"}
      </Button>
      <p className="text-xs text-slate-500">
        {status === "PENDING_SUPPLIER"
          ? "Resubmitting will send your changes to procurement for review."
          : "Submitting locks edits until procurement requests changes."}
      </p>
    </div>
  );
}

