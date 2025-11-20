/**
 * Helpers for working with supplier document files.
 * Later we can swap the implementation to call Supabase/S3 signed URLs
 * without having to touch the rest of the codebase.
 */

import { getFileUrl } from "./storage";

export interface SignedUrlOptions {
  expiresInSeconds?: number;
}

/**
 * Returns a signed URL that can be safely exposed to the client.
 * For local development, returns the file serving URL.
 * In production, this would generate signed URLs from Supabase/S3.
 */
export async function getSignedDocumentUrl(
  fileUrl: string,
  _options?: SignedUrlOptions
): Promise<string> {
  if (!fileUrl) {
    return "";
  }

  // For local storage, fileUrl is the fileId
  // Return the public URL that serves the file
  return getFileUrl(fileUrl);
}


