import { prisma } from "@/lib/prisma";

export interface OptimisticLockError extends Error {
  code: "OPTIMISTIC_LOCK_ERROR";
  currentVersion: number;
  expectedVersion: number;
}

/**
 * Check if application version matches expected version
 * Throws OptimisticLockError if versions don't match
 */
export async function checkApplicationVersion(
  applicationId: string,
  expectedVersion: number
): Promise<void> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { version: true },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.version !== expectedVersion) {
    const error = new Error(
      "Application has been modified by another user. Please refresh and try again."
    ) as OptimisticLockError;
    error.code = "OPTIMISTIC_LOCK_ERROR";
    error.currentVersion = application.version;
    error.expectedVersion = expectedVersion;
    throw error;
  }
}

/**
 * Update application with version increment
 * Returns new version number
 * Throws OptimisticLockError if version doesn't match
 */
export async function updateApplicationWithVersion(
  applicationId: string,
  expectedVersion: number,
  data: {
    data?: Record<string, unknown>;
    status?: string;
    updatedById: string;
    submittedAt?: Date;
    submittedById?: string;
    submissionType?: string;
    [key: string]: unknown;
  }
): Promise<number> {
  // Check version first
  await checkApplicationVersion(applicationId, expectedVersion);

  // Update with version increment
  // Prisma will fail if version doesn't match due to where clause
  const updated = await prisma.application.update({
    where: {
      id: applicationId,
      version: expectedVersion, // This ensures version matches
    },
    data: {
      ...data,
      data: data.data as any,
      status: data.status as any,
      version: { increment: 1 },
    },
    select: { version: true },
  });

  return updated.version;
}

