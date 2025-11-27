import { mkdir, writeFile, readFile, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { supabase } from "./supabase";

/**
 * Storage configuration
 */
const STORAGE_DIR = join(process.cwd(), "storage", "uploads");
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "documents";
const USE_SUPABASE = !!supabase;

if (process.env.NODE_ENV === "production" && !USE_SUPABASE) {
  console.warn(
    "⚠️  WARNING: Running in production without Supabase Storage configured. " +
    "Files will be stored locally and may be lost on deployment/restart. " +
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable cloud storage."
  );
}

/**
 * Ensures the storage directory exists (only for local storage)
 */
export async function ensureStorageDir(): Promise<void> {
  if (!USE_SUPABASE && !existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true });
  }
}

/**
 * Gets the full file path for a given file ID
 * For Supabase, this just returns the file ID
 */
export function getFilePath(fileId: string): string {
  if (USE_SUPABASE) {
    return fileId;
  }
  return join(STORAGE_DIR, fileId);
}

/**
 * Saves a file to storage (Local or Supabase)
 */
export async function saveFile(
  fileId: string,
  buffer: Buffer
): Promise<void> {
  if (USE_SUPABASE) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileId, buffer, {
        contentType: "application/octet-stream",
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
  } else {
    await ensureStorageDir();
    const filePath = getFilePath(fileId);
    await writeFile(filePath, buffer);
  }
}

/**
 * Reads a file from storage (Local or Supabase)
 */
export async function readFileFromStorage(fileId: string): Promise<Buffer> {
  if (USE_SUPABASE) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(fileId);

    if (error) {
      console.error("Supabase download error:", error);
      throw new Error(`Supabase download failed: ${error.message}`);
    }

    return Buffer.from(await data.arrayBuffer());
  } else {
    const filePath = getFilePath(fileId);
    return await readFile(filePath);
  }
}

/**
 * Checks if a file exists in storage
 */
export async function fileExists(fileId: string): Promise<boolean> {
  if (USE_SUPABASE) {
    if (!supabase) return false;

    // We use list to check for existence as it's more reliable than metadata for existence checks
    // and doesn't require downloading the file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list("", {
        limit: 1,
        search: fileId,
      });

    if (error || !data) {
      return false;
    }

    // Exact match check
    return data.some((file) => file.name === fileId);
  } else {
    try {
      const filePath = getFilePath(fileId);
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Generates a unique file ID with extension preserved
 */
export function generateFileId(fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  const baseName = fileName.includes(".")
    ? fileName.substring(0, fileName.lastIndexOf("."))
    : fileName;
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 50);
  return extension
    ? `${sanitizedBase}_${timestamp}_${random}.${extension}`
    : `${sanitizedBase}_${timestamp}_${random}`;
}

/**
 * Gets the public URL for a file (for local development)
 */
export function getFileUrl(fileId: string): string {
  return `/api/documents/file/${fileId}`;
}

