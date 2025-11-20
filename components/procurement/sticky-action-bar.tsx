"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  claimApplicationAction,
  transitionApplicationAction,
  addCommentAction,
} from "@/app/dashboard/procurement/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canApprove,
  canReject,
  canRequestInfo,
  canStartReview,
} from "@/lib/application-state";

type ActionType = "approve" | "reject" | "request";

interface StickyActionBarProps {
  applicationId: string;
  currentStatus: string;
}

export function StickyActionBar({
  applicationId,
  currentStatus,
}: StickyActionBarProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<ActionType | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [assigning, startAssign] = useTransition();

  const openDialog = (type: ActionType) => {
    setNote("");
    setDialog(type);
  };

  const closeDialog = () => {
    setDialog(null);
    setNote("");
  };

  const handleSubmit = () => {
    if (dialog === null) {
      return;
    }
    if (dialog !== "approve" && !note.trim()) {
      return;
    }

    startTransition(async () => {
      if (dialog === "request") {
        await addCommentAction({
          applicationId,
          body: note,
          visibility: "supplier_visible",
          markPending: true,
        });
      } else {
        await transitionApplicationAction({
          applicationId,
          targetStatus: dialog === "approve" ? "APPROVED" : "REJECTED",
          note,
        });
      }
      closeDialog();
      router.refresh();
    });
  };

  const handleAssign = () => {
    startAssign(async () => {
      await claimApplicationAction(applicationId);
      router.refresh();
    });
  };

  const dialogTitle =
    dialog === "approve"
      ? "Approve submission"
      : dialog === "reject"
      ? "Reject submission"
      : "Request more information";

  const dialogDescription =
    dialog === "approve"
      ? "Optionally add an internal note before approving this supplier."
      : dialog === "reject"
      ? "Provide a short explanation that will be visible to the supplier."
      : "Describe the clarification you need. The supplier will receive this note.";

  const canStartReviewNow = canStartReview(currentStatus);
  const canRequestInfoNow = canRequestInfo(currentStatus);
  const canRejectNow = canReject(currentStatus);
  const canApproveNow = canApprove(currentStatus);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Status: {currentStatus}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={assigning}
              onClick={handleAssign}
            >
              {assigning ? "Assigning..." : "Assign to me"}
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                startTransition(async () => {
                  await transitionApplicationAction({
                    applicationId,
                    targetStatus: "IN_REVIEW",
                  });
                  router.refresh();
                });
              }}
              disabled={isPending || !canStartReviewNow}
            >
              {isPending ? "Starting..." : "Start review"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openDialog("request")}
              disabled={!canRequestInfoNow}
            >
              Request info
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openDialog("reject")}
              disabled={!canRejectNow}
            >
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => openDialog("approve")}
              disabled={!canApproveNow}
            >
              Approve
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={dialog !== null} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            placeholder={
              dialog === "request"
                ? "Explain what needs clarification..."
                : "Add an optional note..."
            }
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeDialog}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || (dialog !== "approve" && !note.trim())}
            >
              {isPending ? "Submitting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

