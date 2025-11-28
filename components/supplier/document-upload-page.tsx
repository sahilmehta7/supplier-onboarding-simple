"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, SkipForward, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DocumentUploadCard } from "./document-upload-card";
import type { DocumentRequirement } from "@/lib/forms/form-metadata";
import {
    groupDocumentsByCategory,
    formatCategoryName,
} from "@/lib/forms/form-metadata";

interface DocumentUploadPageProps {
    applicationId: string;
    documents: DocumentRequirement[];
}

export function DocumentUploadPage({
    applicationId,
    documents,
}: DocumentUploadPageProps) {
    const router = useRouter();
    const [uploadedCount, setUploadedCount] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<Record<string, boolean>>({});

    const requiredDocs = documents.filter((d) => d.required);
    const optionalDocs = documents.filter((d) => !d.required);
    const totalRequired = requiredDocs.length;

    const handleUploadComplete = (documentTypeKey: string, success: boolean) => {
        setUploadStatus((prev) => {
            const newState = { ...prev, [documentTypeKey]: success };

            // Recalculate uploaded count for REQUIRED docs only
            const newUploadedCount = requiredDocs.filter(doc => newState[doc.key]).length;
            setUploadedCount(newUploadedCount);

            return newState;
        });
    };

    const handleContinue = () => {
        // Navigate to first form section
        router.push(`/supplier/onboarding/${applicationId}?step=0`);
    };

    const handleSkip = () => {
        // Skip to first form section
        router.push(`/supplier/onboarding/${applicationId}?step=0`);
    };

    // Group documents by category
    const groupedRequired = groupDocumentsByCategory(requiredDocs);
    const groupedOptional = groupDocumentsByCategory(optionalDocs);

    const progressPercentage = totalRequired > 0 ? (uploadedCount / totalRequired) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header & Progress */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold">Document Upload</h2>
                    <p className="text-muted-foreground text-sm">
                        Upload required documents to pre-fill your application.
                    </p>
                </div>

                {/* Minimal Progress Widget */}
                <div className="flex items-center gap-4 bg-slate-50 border rounded-lg px-4 py-2 min-w-[240px]">
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                            <span>Required Documents</span>
                            <span className={uploadedCount === totalRequired ? "text-green-600" : "text-slate-600"}>
                                {uploadedCount}/{totalRequired}
                            </span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                    </div>
                    {uploadedCount === totalRequired && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                </div>
            </div>

            {/* Main Content - Single Card for Required Docs */}
            <Card>
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <CardTitle className="text-base">Required Documents</CardTitle>
                    <CardDescription>
                        These documents are mandatory for your application.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {requiredDocs.length > 0 ? (
                        <div className="divide-y">
                            {Array.from(groupedRequired.keys())
                                .sort()
                                .map((category) => {
                                    const categoryDocs = groupedRequired.get(category)!;
                                    return categoryDocs.map((doc) => (
                                        <div key={doc.key} className="px-6 hover:bg-slate-50/50 transition-colors">
                                            <DocumentUploadCard
                                                document={doc}
                                                applicationId={applicationId}
                                                onUploadComplete={handleUploadComplete}
                                            />
                                        </div>
                                    ));
                                })}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                            No required documents for this form.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Optional Documents Section */}
            {optionalDocs.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-medium px-1">Optional Documents</h3>
                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {Array.from(groupedOptional.keys())
                                    .sort()
                                    .map((category) => {
                                        const categoryDocs = groupedOptional.get(category)!;
                                        return categoryDocs.map((doc) => (
                                            <div key={doc.key} className="px-6 hover:bg-slate-50/50 transition-colors">
                                                <DocumentUploadCard
                                                    document={doc}
                                                    applicationId={applicationId}
                                                    onUploadComplete={handleUploadComplete}
                                                />
                                            </div>
                                        ));
                                    })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                >
                    Skip for now
                </Button>
                <Button
                    onClick={handleContinue}
                    className="flex items-center gap-2 min-w-[140px]"
                >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
