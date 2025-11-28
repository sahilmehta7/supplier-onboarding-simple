"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApplicationState } from "@/lib/supplier-access";
import { formatDistanceToNow } from "date-fns";
import { DiscardDraftButton } from "@/components/dashboard/discard-draft-button";

interface ApplicationStatusCardProps {
    applicationState: ApplicationState;
    organizationId: string;
}

function getStatusColor(
    status: ApplicationState["status"]
): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "DRAFT":
            return "secondary";
        case "SUBMITTED":
        case "IN_REVIEW":
            return "default";
        case "PENDING_SUPPLIER":
            return "outline";
        case "APPROVED":
            return "default";
        case "REJECTED":
            return "destructive";
        default:
            return "outline";
    }
}

function getStatusIcon(status: ApplicationState["status"]): string {
    switch (status) {
        case "DRAFT":
            return "📝";
        case "SUBMITTED":
            return "📤";
        case "IN_REVIEW":
            return "🔍";
        case "PENDING_SUPPLIER":
            return "⏳";
        case "APPROVED":
            return "✅";
        case "REJECTED":
            return "❌";
        default:
            return "📄";
    }
}

export function ApplicationStatusCard({
    applicationState,
    organizationId,
}: ApplicationStatusCardProps) {
    const { application, status, actionText, requiresAction } = applicationState;

    const getActionHref = () => {
        if (status === "APPROVED" && application.supplier) {
            return `/supplier/profile/${application.supplier.id}`;
        }
        if (status === "REJECTED") {
            return `/supplier`; // Will show entity/geography selector
        }
        return `/supplier/onboarding/${application.id}`;
    };

    return (
        <Card className="shadow-none">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">
                            {application.entity.name} - {application.geography.name}
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                            Application ID: {application.id.slice(0, 8).toUpperCase()}
                        </p>
                    </div>
                    <Badge variant={getStatusColor(status)}>
                        {getStatusIcon(status)} {status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Created:</span>
                        <span className="font-medium">
                            {formatDistanceToNow(new Date(application.createdAt), {
                                addSuffix: true,
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Last Updated:</span>
                        <span className="font-medium">
                            {formatDistanceToNow(new Date(application.updatedAt), {
                                addSuffix: true,
                            })}
                        </span>
                    </div>
                    {application.submittedAt && (
                        <div className="flex justify-between">
                            <span className="text-slate-500">Submitted:</span>
                            <span className="font-medium">
                                {formatDistanceToNow(new Date(application.submittedAt), {
                                    addSuffix: true,
                                })}
                            </span>
                        </div>
                    )}
                    {status === "REJECTED" && application.rejectionReason && (
                        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-xs font-medium text-red-900">
                                Rejection Reason:
                            </p>
                            <p className="mt-1 text-xs text-red-700">
                                {application.rejectionReason}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Link
                        href={getActionHref()}
                        className={`inline-flex flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition ${requiresAction
                                ? "bg-slate-900 text-white hover:bg-slate-800"
                                : "border border-slate-200 text-slate-900 hover:bg-slate-50"
                            }`}
                    >
                        {actionText}
                    </Link>
                    {status === "DRAFT" && (
                        <DiscardDraftButton
                            applicationId={application.id}
                            organizationId={organizationId}
                        />
                    )}
                </div>

                {status === "DRAFT" && (
                    <p className="text-xs text-slate-500">
                        Complete and submit your application to begin the review process.
                    </p>
                )}
                {status === "SUBMITTED" && (
                    <p className="text-xs text-slate-500">
                        Your application has been submitted and is awaiting review.
                    </p>
                )}
                {status === "IN_REVIEW" && (
                    <p className="text-xs text-slate-500">
                        Your application is currently being reviewed by our team.
                    </p>
                )}
                {status === "PENDING_SUPPLIER" && (
                    <p className="text-xs text-slate-500">
                        Action required: Please review and respond to the pending items.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
