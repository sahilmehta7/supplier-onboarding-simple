"use client";

import { useCallback, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import type { DraftSummary } from "@/lib/forms/draft-manager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DraftResumeDialogProps {
  drafts: DraftSummary[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectDraft: (applicationId: string | null) => Promise<void> | void;
  onDeleteDraft: (applicationId: string) => Promise<void> | void;
  triggerLabel?: string;
}

export function DraftResumeDialog({
  drafts,
  open,
  onOpenChange,
  onSelectDraft,
  onDeleteDraft,
  triggerLabel = "Resume draft",
}: DraftResumeDialogProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setIsOpen(nextOpen);
      onOpenChange?.(nextOpen);
      if (!nextOpen) {
        setError(null);
      }
    },
    [onOpenChange]
  );

  const handleSelect = useCallback(
    async (applicationId: string | null) => {
      setResumingId(applicationId ?? "new");
      setError(null);
      try {
        await onSelectDraft(applicationId);
        handleOpenChange(false);
      } catch (err) {
        console.error("Failed to select draft", err);
        setError(
          err instanceof Error ? err.message : "Failed to resume draft. Try again."
        );
      } finally {
        setResumingId(null);
      }
    },
    [handleOpenChange, onSelectDraft]
  );

  const handleDelete = useCallback(
    async (applicationId: string) => {
      setDeletingId(applicationId);
      setError(null);
      try {
        await onDeleteDraft(applicationId);
      } catch (err) {
        console.error("Failed to delete draft", err);
        setError(
          err instanceof Error ? err.message : "Failed to delete draft. Try again."
        );
      } finally {
        setDeletingId(null);
      }
    },
    [onDeleteDraft]
  );

  if (drafts.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resume a saved draft</DialogTitle>
          <DialogDescription>
            Choose an existing draft to continue or start a new submission.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-3 overflow-y-auto py-2 pr-2">
          {drafts.map((draft) => {
            const isResuming =
              resumingId !== null &&
              (resumingId === draft.applicationId || resumingId === "new");
            const isDeleting = deletingId === draft.applicationId;

            return (
              <div
                key={draft.applicationId}
                className="rounded-lg border border-border/60 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {draft.title || "Untitled Form"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Step {draft.currentStep + 1} of {draft.totalSteps} · Saved{" "}
                      {formatDistanceToNow(new Date(draft.lastSavedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleSelect(draft.applicationId)}
                      disabled={isDeleting || resumingId !== null}
                    >
                      {isResuming && (
                        <Loader2 className="mr-2 size-3 animate-spin" />
                      )}
                      Resume
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDelete(draft.applicationId)}
                      disabled={isDeleting || resumingId !== null}
                      aria-label="Delete draft"
                    >
                      {isDeleting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleSelect(null)}
            disabled={resumingId !== null}
          >
            {resumingId === "new" && (
              <Loader2 className="mr-2 size-3 animate-spin" />
            )}
            Start new submission
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

