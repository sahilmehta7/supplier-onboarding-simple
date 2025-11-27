"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    const totalDocs = documents.length;

    const handleUploadComplete = (documentTypeKey: string, success: boolean) => {
        setUploadStatus((prev) => ({ ...prev, [documentTypeKey]: success }));
        if (success) {
            setUploadedCount((prev) => prev + 1);
        }
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

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Document Upload</h2>
                <p className="text-muted-foreground">
                    Upload your documents now to pre-fill form fields automatically. You can also upload them later in the respective sections.
                </p>
            </div>

            {/* Progress Summary */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Upload Progress
                            </p>
                            <p className="text-2xl font-semibold mt-1">
                                {uploadedCount} of {totalDocs} documents
                            </p>
                        </div>
                        <Badge variant="secondary" className="text-lg px-4 py-2">
                            {totalDocs > 0
                                ? Math.round((uploadedCount / totalDocs) * 100)
                                : 0}
                            %
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Required Documents */}
            {requiredDocs.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Required Documents</h3>
                        <Badge variant="destructive">{requiredDocs.length}</Badge>
                    </div>

                    {Array.from(groupedRequired.keys())
                        .sort()
                        .map((category) => {
                            const categoryDocs = groupedRequired.get(category)!;
                            return (
                                <div key={category} className="space-y-3">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        {formatCategoryName(category)}
                                    </h4>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {categoryDocs.map((doc) => (
                                            <DocumentUploadCard
                                                key={doc.key}
                                                document={doc}
                                                applicationId={applicationId}
                                                onUploadComplete={handleUploadComplete}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Optional Documents */}
            {optionalDocs.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Optional Documents</h3>
                        <Badge variant="secondary">{optionalDocs.length}</Badge>
                    </div>

                    {Array.from(groupedOptional.keys())
                        .sort()
                        .map((category) => {
                            const categoryDocs = groupedOptional.get(category)!;
                            return (
                                <div key={category} className="space-y-3">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        {formatCategoryName(category)}
                                    </h4>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {categoryDocs.map((doc) => (
                                            <DocumentUploadCard
                                                key={doc.key}
                                                document={doc}
                                                applicationId={applicationId}
                                                onUploadComplete={handleUploadComplete}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 pt-6 border-t">
                <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex items-center gap-2"
                >
                    <SkipForward className="h-4 w-4" />
                    Skip for now
                </Button>
                <Button
                    onClick={handleContinue}
                    className="flex items-center gap-2"
                >
                    Continue to Form
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
