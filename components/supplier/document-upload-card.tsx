"use client";

import { useState } from "react";
import { Upload, CheckCircle2, XCircle, Loader2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentRequirement } from "@/lib/forms/form-metadata";

interface DocumentUploadCardProps {
    document: DocumentRequirement;
    applicationId: string;
    onUploadComplete?: (documentTypeKey: string, success: boolean) => void;
    className?: string;
}

type UploadStatus = "idle" | "uploading" | "processing_ocr" | "completed" | "failed";

export function DocumentUploadCard({
    document,
    applicationId,
    onUploadComplete,
    className,
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
        <div className={cn("flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b last:border-0", className)}>
            {/* Icon & Status Indicator */}
            <div className="flex-shrink-0 relative">
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border",
                    isUploaded ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-200 text-slate-400"
                )}>
                    {isUploaded ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-slate-900">
                        {document.label}
                    </h4>
                    {isRequired && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                            Required
                        </Badge>
                    )}
                </div>

                {document.description && (
                    <p className="text-xs text-slate-500 mb-1">
                        {document.description}
                    </p>
                )}

                {/* Status Message */}
                {status === "uploading" && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading...
                    </div>
                )}
                {status === "processing_ocr" && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing...
                    </div>
                )}
                {status === "failed" && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {error || "Upload failed"}
                    </div>
                )}
                {status === "completed" && (
                    <p className="text-xs text-green-600 mt-1 truncate max-w-[200px]">
                        {fileName}
                    </p>
                )}
            </div>

            {/* Action */}
            <div className="flex-shrink-0">
                {status === "idle" || status === "failed" ? (
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
                                className="cursor-pointer h-8 text-xs"
                                asChild
                            >
                                <span>
                                    <Upload className="h-3.5 w-3.5 mr-2" />
                                    Upload
                                </span>
                            </Button>
                        </label>
                    </div>
                ) : status === "completed" ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-slate-500 hover:text-slate-900"
                        onClick={() => {
                            setStatus("idle");
                            setFileName("");
                        }}
                    >
                        Replace
                    </Button>
                ) : (
                    <Button disabled variant="ghost" size="sm" className="h-8 text-xs">
                        Please wait
                    </Button>
                )}
            </div>
        </div>
    );
}
