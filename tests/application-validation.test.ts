import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  canEditApplication,
  canSubmitApplication,
  hasActiveApplication,
  getEditableFields,
} from "@/lib/application-validation";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findFirst: vi.fn(),
    },
    applicationComment: {
      findMany: vi.fn(),
    },
  },
}));

describe("application-validation", () => {
  describe("canEditApplication", () => {
    it("should return true for DRAFT status", () => {
      expect(canEditApplication("DRAFT")).toBe(true);
    });

    it("should return true for PENDING_SUPPLIER status", () => {
      expect(canEditApplication("PENDING_SUPPLIER")).toBe(true);
    });

    it("should return false for SUBMITTED status", () => {
      expect(canEditApplication("SUBMITTED")).toBe(false);
    });

    it("should return false for IN_REVIEW status", () => {
      expect(canEditApplication("IN_REVIEW")).toBe(false);
    });

    it("should return false for APPROVED status", () => {
      expect(canEditApplication("APPROVED")).toBe(false);
    });

    it("should return false for REJECTED status", () => {
      expect(canEditApplication("REJECTED")).toBe(false);
    });
  });

  describe("canSubmitApplication", () => {
    it("should return true for DRAFT status", () => {
      expect(canSubmitApplication("DRAFT")).toBe(true);
    });

    it("should return true for PENDING_SUPPLIER status", () => {
      expect(canSubmitApplication("PENDING_SUPPLIER")).toBe(true);
    });

    it("should return false for SUBMITTED status", () => {
      expect(canSubmitApplication("SUBMITTED")).toBe(false);
    });

    it("should return false for IN_REVIEW status", () => {
      expect(canSubmitApplication("IN_REVIEW")).toBe(false);
    });

    it("should return false for APPROVED status", () => {
      expect(canSubmitApplication("APPROVED")).toBe(false);
    });

    it("should return false for REJECTED status", () => {
      expect(canSubmitApplication("REJECTED")).toBe(false);
    });
  });

  describe("hasActiveApplication", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return true when active application exists", async () => {
      vi.mocked(prisma.application.findFirst).mockResolvedValue({
        id: "app-1",
        status: "SUBMITTED",
      } as any);

      const result = await hasActiveApplication("org-1", "config-1");
      expect(result).toBe(true);
      expect(prisma.application.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          formConfigId: "config-1",
          status: { in: ["DRAFT", "SUBMITTED", "IN_REVIEW", "PENDING_SUPPLIER", "APPROVED"] },
        },
      });
    });

    it("should return false when no active application exists", async () => {
      vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

      const result = await hasActiveApplication("org-1", "config-1");
      expect(result).toBe(false);
    });
  });

  describe("getEditableFields", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return field keys from supplier-visible comments", async () => {
      vi.mocked(prisma.applicationComment.findMany).mockResolvedValue([
        { fieldKey: "supplierInformation.supplierName" },
        { fieldKey: "addresses.remitToAddress.line1" },
        { fieldKey: null }, // Should be filtered out
      ] as any);

      const result = await getEditableFields("app-1");
      expect(result).toEqual([
        "supplierInformation.supplierName",
        "addresses.remitToAddress.line1",
      ]);
      expect(prisma.applicationComment.findMany).toHaveBeenCalledWith({
        where: {
          applicationId: "app-1",
          visibility: "supplier_visible",
          fieldKey: { not: null },
        },
        select: { fieldKey: true },
      });
    });

    it("should return empty array when no comments exist", async () => {
      vi.mocked(prisma.applicationComment.findMany).mockResolvedValue([]);

      const result = await getEditableFields("app-1");
      expect(result).toEqual([]);
    });

    it("should filter out null and undefined field keys", async () => {
      vi.mocked(prisma.applicationComment.findMany).mockResolvedValue([
        { fieldKey: "supplierInformation.supplierName" },
        { fieldKey: null },
        { fieldKey: undefined },
      ] as any);

      const result = await getEditableFields("app-1");
      // Filter should remove null and undefined values
      expect(result).toEqual(["supplierInformation.supplierName"]);
      expect(result.length).toBe(1);
    });
  });
});

