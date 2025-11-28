"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteFormDraft } from "@/app/forms/actions";
import { useToast } from "@/components/ui/use-toast";

interface DiscardDraftButtonProps {
    applicationId: string;
    organizationId: string;
}

export function DiscardDraftButton({
    applicationId,
    organizationId,
}: DiscardDraftButtonProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);

    function handleDiscard() {
        startTransition(async () => {
            try {
                await deleteFormDraft({
                    applicationId,
                    organizationId,
                });
                toast({
                    title: "Draft discarded",
                    description: "The draft application has been successfully deleted.",
                });
                router.refresh();
                setOpen(false);
            } catch (error) {
                console.error("Failed to discard draft:", error);
                toast({
                    title: "Error",
                    description: "Failed to discard draft. Please try again.",
                    variant: "destructive",
                });
            }
        });
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Discard draft"
                >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Discard draft</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Discard draft application?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        draft application and all entered data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            handleDiscard();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isPending}
                    >
                        {isPending ? "Discarding..." : "Discard"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

