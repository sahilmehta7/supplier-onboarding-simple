/**
 * Client-side document validation helpers
 * Provides immediate feedback before form submission
 */

import type { DocumentFieldValue } from "@/components/forms/field-document-upload";

/**
 * Validates document field value structure (client-side only)
 * Does not check file existence in storage (that's server-side)
 */
export function validateDocumentValue(
  value: unknown,
  required: boolean
): { isValid: boolean; error?: string } {
  // If not required and empty, it's valid
  if (!required && (!value || value === null)) {
    return { isValid: true };
  }

  // If required but empty, it's invalid
  if (required && (!value || value === null)) {
    return {
      isValid: false,
      error: "This document is required",
    };
  }

  // Validate structure
  if (typeof value !== "object" || value === null) {
    return {
      isValid: false,
      error: "Invalid document format",
    };
  }

  const doc = value as Record<string, unknown>;

  if (typeof doc.fileId !== "string" || doc.fileId.length === 0) {
    return {
      isValid: false,
      error: "Document is missing file identifier",
    };
  }

  if (typeof doc.fileName !== "string" || doc.fileName.length === 0) {
    return {
      isValid: false,
      error: "Document is missing file name",
    };
  }

  // Check if uploadedAt is valid if present
  if (doc.uploadedAt && typeof doc.uploadedAt === "string") {
    const uploadDate = new Date(doc.uploadedAt);
    if (isNaN(uploadDate.getTime())) {
      return {
        isValid: false,
        error: "Invalid upload timestamp",
      };
    }
  }

  return { isValid: true };
}

/**
 * Checks if a document value represents a successfully uploaded document
 */
export function isDocumentUploaded(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const doc = value as DocumentFieldValue;
  return (
    typeof doc.fileId === "string" &&
    doc.fileId.length > 0 &&
    typeof doc.fileName === "string" &&
    doc.fileName.length > 0
  );
}

