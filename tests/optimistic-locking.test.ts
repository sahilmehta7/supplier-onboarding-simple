import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  checkApplicationVersion,
  updateApplicationWithVersion,
  OptimisticLockError,
} from "@/lib/optimistic-locking";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Optimistic Locking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkApplicationVersion", () => {
    it("should pass when versions match", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        version: 5,
      } as any);

      await expect(
        checkApplicationVersion("app-1", 5)
      ).resolves.not.toThrow();
    });

    it("should throw OptimisticLockError when versions don't match", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        version: 6,
      } as any);

      await expect(checkApplicationVersion("app-1", 5)).rejects.toThrow(
        OptimisticLockError
      );

      try {
        await checkApplicationVersion("app-1", 5);
      } catch (error) {
        expect((error as OptimisticLockError).code).toBe(
          "OPTIMISTIC_LOCK_ERROR"
        );
        expect((error as OptimisticLockError).currentVersion).toBe(6);
        expect((error as OptimisticLockError).expectedVersion).toBe(5);
      }
    });

    it("should throw error when application not found", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue(null);

      await expect(checkApplicationVersion("app-1", 5)).rejects.toThrow(
        "Application not found"
      );
    });
  });

  describe("updateApplicationWithVersion", () => {
    it("should update application and increment version when versions match", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        version: 5,
      } as any);

      vi.mocked(prisma.application.update).mockResolvedValue({
        version: 6,
      } as any);

      const result = await updateApplicationWithVersion(
        "app-1",
        5,
        {
          data: { test: "value" },
          updatedById: "user-1",
        }
      );

      expect(result).toBe(6);
      expect(prisma.application.update).toHaveBeenCalledWith({
        where: {
          id: "app-1",
          version: 5,
        },
        data: {
          data: { test: "value" },
          updatedById: "user-1",
          version: { increment: 1 },
        },
        select: { version: true },
      });
    });

    it("should throw OptimisticLockError when versions don't match", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        version: 6,
      } as any);

      await expect(
        updateApplicationWithVersion("app-1", 5, {
          data: { test: "value" },
          updatedById: "user-1",
        })
      ).rejects.toThrow(OptimisticLockError);
    });
  });
});

