/**
 * Document validation utilities for form integration
 * Ensures documents are properly uploaded and exist in storage
 */

import type { FormField } from "@prisma/client";
import { fileExists } from "@/lib/storage";
import type { DocumentFieldValue } from "@/components/forms/field-document-upload";

/**
 * Validates that a document field value represents a valid uploaded document
 */
export async function validateDocumentField(
  field: FormField,
  value: unknown
): Promise<{ isValid: boolean; error?: string }> {
  // If field is not required and value is empty/null, it's valid
  if (!field.required && (!value || value === null)) {
    return { isValid: true };
  }

  // If field is required but value is empty, it's invalid
  if (field.required && (!value || value === null)) {
    return {
      isValid: false,
      error: `${field.label} is required`,
    };
  }

  // Validate document value structure
  let documentValue: DocumentFieldValue | null = null;

  if (typeof value === "object" && value !== null) {
    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.fileId === "string" &&
      typeof candidate.fileName === "string"
    ) {
      documentValue = {
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
          typeof candidate.uploadedAt === "string"
            ? candidate.uploadedAt
            : undefined,
      };
    }
  }

  if (!documentValue) {
    return {
      isValid: false,
      error: `${field.label} must be a valid document`,
    };
  }

  // Validate fileId exists
  if (!documentValue.fileId) {
    return {
      isValid: false,
      error: `${field.label} is missing file identifier`,
    };
  }

  // Check if file exists in storage
  try {
    const exists = await fileExists(documentValue.fileId);
    if (!exists) {
      return {
        isValid: false,
        error: `${field.label} file not found in storage. Please re-upload the document.`,
      };
    }
  } catch (error) {
    console.error("Error checking file existence:", error);
    return {
      isValid: false,
      error: `${field.label} could not be verified. Please try re-uploading.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates all document fields in form data
 */
export async function validateDocumentFields(
  formData: Record<string, unknown>,
  fields: FormField[]
): Promise<{ isValid: boolean; errors: Record<string, string> }> {
  const errors: Record<string, string> = {};
  const documentFields = fields.filter((field) => field.type === "document");

  // Validate all document fields in parallel
  const validationResults = await Promise.all(
    documentFields.map(async (field) => {
      const value = formData[field.key];
      const result = await validateDocumentField(field, value);
      if (!result.isValid && result.error) {
        errors[field.key] = result.error;
      }
      return result;
    })
  );

  const isValid = validationResults.every((result) => result.isValid);

  return { isValid, errors };
}

/**
 * Checks if a document field has a valid uploaded document
 */
export function hasValidDocument(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const doc = value as Record<string, unknown>;
  return (
    typeof doc.fileId === "string" &&
    doc.fileId.length > 0 &&
    typeof doc.fileName === "string" &&
    doc.fileName.length > 0
  );
}

