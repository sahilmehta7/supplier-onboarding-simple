import { mkdir, writeFile, readFile, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Local file storage for development/testing.
 * Files are stored in ./storage/uploads directory.
 */

const STORAGE_DIR = join(process.cwd(), "storage", "uploads");

/**
 * Ensures the storage directory exists
 */
export async function ensureStorageDir(): Promise<void> {
  if (!existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true });
  }
}

/**
 * Gets the full file path for a given file ID
 */
export function getFilePath(fileId: string): string {
  return join(STORAGE_DIR, fileId);
}

/**
 * Saves a file to local storage
 */
export async function saveFile(
  fileId: string,
  buffer: Buffer
): Promise<void> {
  await ensureStorageDir();
  const filePath = getFilePath(fileId);
  await writeFile(filePath, buffer);
}

/**
 * Reads a file from local storage
 */
export async function readFileFromStorage(fileId: string): Promise<Buffer> {
  const filePath = getFilePath(fileId);
  return await readFile(filePath);
}

/**
 * Checks if a file exists in storage
 */
export async function fileExists(fileId: string): Promise<boolean> {
  try {
    const filePath = getFilePath(fileId);
    await stat(filePath);
    return true;
  } catch {
    return false;
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

