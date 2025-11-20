"use client";

import { useMemo, useRef, useState } from "react";
import type { FormField } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldWrapper } from "./field-wrapper";

export interface DocumentFieldValue {
  fileId: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  documentTypeKey?: string;
  uploadedAt?: string;
}

interface FieldDocumentUploadProps {
  field: FormField;
  value: unknown;
  onChange: (value: DocumentFieldValue | null) => void;
  applicationId: string | null;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  touched?: boolean;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function getDocumentTypeKey(options: unknown): string {
  if (options && typeof options === "object") {
    const maybeKey = (options as { documentTypeKey?: unknown }).documentTypeKey;
    if (typeof maybeKey === "string") {
      return maybeKey;
    }
  }
  return "";
}

function normalizeDocumentValue(value: unknown): DocumentFieldValue | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return normalizeDocumentValue(value[0]);
  }
  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.fileId === "string" && typeof candidate.fileName === "string") {
      return {
        fileId: candidate.fileId,
        fileName: candidate.fileName,
        mimeType: typeof candidate.mimeType === "string" ? candidate.mimeType : undefined,
        fileSize:
          typeof candidate.fileSize === "number"
            ? candidate.fileSize
            : typeof candidate.fileSize === "string"
            ? Number(candidate.fileSize)
            : undefined,
        documentTypeKey:
          typeof candidate.documentTypeKey === "string"
            ? candidate.documentTypeKey
            : undefined,
        uploadedAt:
          typeof candidate.uploadedAt === "string" ? candidate.uploadedAt : undefined,
      };
    }
  }
  return null;
}

const humanFileSize = (size?: number) => {
  if (!size || Number.isNaN(size)) {
    return null;
  }
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

async function parseError(response: Response) {
  try {
    const body = await response.json();
    return body?.error ?? body?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export function FieldDocumentUpload({
  field,
  value,
  onChange,
  applicationId,
  onBlur,
  error,
  disabled,
  touched = true,
}: FieldDocumentUploadProps) {
  const [status, setStatus] = useState<"idle" | "signing" | "uploading" | "saving" | "error">(
    "idle"
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypeKey = getDocumentTypeKey(field.options);
  const existingValue = useMemo(() => normalizeDocumentValue(value), [value]);
  const canUpload = Boolean(applicationId && documentTypeKey && !disabled);
  const isBusy = status === "signing" || status === "uploading" || status === "saving";

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!applicationId) {
      setUploadError("Save your progress to create an application before uploading.");
      resetInput();
      return;
    }
    if (!documentTypeKey) {
      setUploadError("This field is missing a document type. Ask an admin to configure it.");
      resetInput();
      return;
    }

    try {
      setUploadError(null);
      setStatus("signing");
      setStatusMessage("Requesting upload URL…");
      const signResponse = await fetch("/api/documents/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }),
      });
      if (!signResponse.ok) {
        throw new Error(await parseError(signResponse));
      }
      const { uploadUrl, fileId } = await signResponse.json();

      if (!fileId) {
        throw new Error("Upload session did not return a file identifier.");
      }

      if (uploadUrl) {
        setStatus("uploading");
        setStatusMessage("Uploading file…");
        try {
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            body: file,
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
          });
          if (!uploadResponse.ok) {
            throw new Error(await parseError(uploadResponse));
          }
        } catch (storageError) {
          console.error("Upload to storage failed:", storageError);
          throw storageError;
        }
      }

      setStatus("saving");
      setStatusMessage("Saving document metadata…");
      const saveResponse = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          documentTypeKey,
          fileId,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }),
      });
      if (!saveResponse.ok) {
        throw new Error(await parseError(saveResponse));
      }

      const nextValue: DocumentFieldValue = {
        fileId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        documentTypeKey,
        uploadedAt: new Date().toISOString(),
      };
      onChange(nextValue);
      onBlur?.();
      setStatus("idle");
      setStatusMessage("Upload complete");
      
      // Clear any previous errors since upload succeeded
      setUploadError(null);
    } catch (err) {
      setStatus("error");
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      resetInput();
    }
  };

  const handleRemove = () => {
    onChange(null);
    setUploadError(null);
    setStatus("idle");
    setStatusMessage("");
    resetInput();
    onBlur?.();
  };

  return (
    <FieldWrapper field={field} error={error} touched={touched}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {documentTypeKey ? (
            <>
              <Badge variant="secondary">{documentTypeKey}</Badge>
              <span>Uploads link directly to this document type.</span>
            </>
          ) : (
            <span className="text-amber-600">
              Document type not configured. Uploads are disabled for this field.
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          id={`field-${field.id}`}
          aria-describedby={
            field.helpText ? `field-${field.id}-help` : undefined
          }
          aria-invalid={Boolean(error)}
          aria-required={field.required}
          disabled={!canUpload || isBusy}
          onChange={handleFileChange}
          onBlur={onBlur}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground file:transition-colors file:hover:bg-secondary/80 disabled:cursor-not-allowed"
        />
        {!applicationId && (
          <p className="text-xs text-amber-600">
            Save the form once to generate an application before uploading documents.
          </p>
        )}
        {uploadError && (
          <p className="text-sm text-destructive" role="alert">
            {uploadError}
          </p>
        )}
        {statusMessage && !uploadError && (
          <p className="text-xs text-muted-foreground">{statusMessage}</p>
        )}

        {existingValue ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">{existingValue.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {humanFileSize(existingValue.fileSize) ?? "Unknown size"}
              {" • "}
              Uploaded{" "}
              {existingValue.uploadedAt
                ? `${DATE_FORMATTER.format(new Date(existingValue.uploadedAt))} UTC`
                : "recently"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isBusy}
              >
                Remove file
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No document uploaded yet. Accepted formats depend on your storage rules.
          </p>
        )}
      </div>
    </FieldWrapper>
  );
}

