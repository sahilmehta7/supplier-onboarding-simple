/**
 * Check if form data is too large and needs special handling
 */
export function isFormDataLarge(data: Record<string, unknown>): boolean {
  const jsonString = JSON.stringify(data);
  const sizeInBytes = new Blob([jsonString]).size;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  // Warn if larger than 1MB
  return sizeInMB > 1;
}

/**
 * Validate form data size before submission
 */
export function validateFormDataSize(data: Record<string, unknown>): {
  valid: boolean;
  size: number;
  message?: string;
} {
  const jsonString = JSON.stringify(data);
  const sizeInBytes = new Blob([jsonString]).size;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > 5) {
    return {
      valid: false,
      size: sizeInMB,
      message:
        "Form data is too large. Please reduce the number of documents or fields.",
    };
  }

  if (sizeInMB > 1) {
    return {
      valid: true,
      size: sizeInMB,
      message:
        "Form data is large. Submission may take longer than usual.",
    };
  }

  return {
    valid: true,
    size: sizeInMB,
  };
}

