"use client";

import { useState } from "react";
import { Upload, CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DocumentRequirement } from "@/lib/forms/form-metadata";

interface DocumentUploadCardProps {
    document: DocumentRequirement;
    applicationId: string;
    onUploadComplete?: (documentTypeKey: string, success: boolean) => void;
}

type UploadStatus = "idle" | "uploading" | "processing_ocr" | "completed" | "failed";

export function DocumentUploadCard({
    document,
    applicationId,
    onUploadComplete,
}: DocumentUploadCardProps) {
    const [status, setStatus] = useState<UploadStatus>("idle");
    const [fileName, setFileName] = useState<string>("");
    const [error, setError] = useState<string>("");

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file size (10MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            setError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
            setStatus("failed");
            return;
        }

        setFileName(file.name);
        setStatus("uploading");
        setError("");

        try {
            // Upload file
            const formData = new FormData();
            formData.append("file", file);
            formData.append("applicationId", applicationId);
            formData.append("documentTypeKey", document.key);

            const uploadResponse = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error || "Upload failed");
            }

            const uploadData = await uploadResponse.json();
            const documentId = uploadData.documentId;

            // Trigger OCR extraction and wait for completion
            setStatus("processing_ocr");

            const ocrResponse = await fetch("/api/supplier/ocr-extract", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ documentId }),
            });

            // Wait for OCR to fully complete
            const ocrData = await ocrResponse.json();

            if (!ocrResponse.ok || !ocrData.success) {
                console.warn("OCR processing failed:", ocrData.error || "Unknown error");
                // Still mark upload as complete, OCR failure is not upload failure
            } else {
                console.log("OCR completed successfully for document:", documentId);
            }

            // Only mark as completed after OCR finishes (or fails)
            setStatus("completed");
            onUploadComplete?.(document.key, true);
        } catch (err) {
            console.error("Upload error:", err);
            setStatus("failed");
            setError(err instanceof Error ? err.message : "Upload failed");
            onUploadComplete?.(document.key, false);
        }
    };

    const isRequired = document.required;
    const isUploaded = status === "completed";

    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h4 className="font-medium text-sm leading-tight">
                                {document.label}
                            </h4>
                            <Badge
                                variant={isRequired ? "default" : "secondary"}
                                className="text-xs flex-shrink-0"
                            >
                                {isRequired ? "Required" : "Optional"}
                            </Badge>
                        </div>

                        {document.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {document.description}
                            </p>
                        )}

                        {document.helpText && (
                            <p className="mt-1 text-xs text-muted-foreground italic">
                                {document.helpText}
                            </p>
                        )}

                        {/* Upload Status */}
                        <div className="mt-3">
                            {status === "idle" && (
                                <div>
                                    <input
                                        type="file"
                                        id={`file-${document.key}`}
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    <label htmlFor={`file-${document.key}`}>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="cursor-pointer"
                                            asChild
                                        >
                                            <span>
                                                <Upload className="h-4 w-4 mr-2" />
                                                Upload Document
                                            </span>
                                        </Button>
                                    </label>
                                </div>
                            )}

                            {status === "uploading" && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Uploading...</span>
                                </div>
                            )}

                            {status === "processing_ocr" && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Processing document...</span>
                                </div>
                            )}

                            {status === "completed" && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="font-medium">Uploaded</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {fileName}
                                    </p>
                                </div>
                            )}

                            {status === "failed" && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-red-600">
                                        <XCircle className="h-4 w-4" />
                                        <span className="font-medium">Failed</span>
                                    </div>
                                    {error && (
                                        <p className="text-xs text-red-600">{error}</p>
                                    )}
                                    <input
                                        type="file"
                                        id={`file-retry-${document.key}`}
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    <label htmlFor={`file-retry-${document.key}`}>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="cursor-pointer"
                                            asChild
                                        >
                                            <span>
                                                <Upload className="h-4 w-4 mr-2" />
                                                Try Again
                                            </span>
                                        </Button>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Completed indicator overlay */}
            {isUploaded && (
                <div className="absolute inset-y-0 left-0 w-1 bg-green-500" />
            )}
        </Card>
    );
}
