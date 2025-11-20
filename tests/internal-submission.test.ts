import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createApplicationOnBehalfAction,
  submitOnBehalfAction,
  editDraftOnBehalfAction,
} from "@/app/dashboard/procurement/[id]/actions";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/permissions";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    formConfig: {
      findUnique: vi.fn(),
    },
    application: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Internal Team Submission Actions", () => {
  const mockUserId = "user-123";
  const mockOrgId = "org-123";
  const mockFormConfigId = "form-config-123";
  const mockApplicationId = "app-123";
  const mockEntityId = "entity-123";
  const mockGeographyId = "geo-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: "admin@example.com" },
    } as any);
    vi.mocked(requireRole).mockResolvedValue({
      role: "ADMIN",
      userId: mockUserId,
      organizationId: mockOrgId,
    } as any);
  });

  describe("createApplicationOnBehalfAction", () => {
    it("should create application successfully with valid input", async () => {
      const mockFormConfig = {
        id: mockFormConfigId,
        entityId: mockEntityId,
        geographyId: mockGeographyId,
        entity: { id: mockEntityId },
        geography: { id: mockGeographyId },
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: mockOrgId,
        name: "Test Org",
      } as any);

      vi.mocked(prisma.formConfig.findUnique).mockResolvedValue(
        mockFormConfig as any
      );

      vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.application.create).mockResolvedValue({
        id: mockApplicationId,
        organizationId: mockOrgId,
        formConfigId: mockFormConfigId,
        status: "DRAFT",
      } as any);

      const result = await createApplicationOnBehalfAction({
        organizationId: mockOrgId,
        formConfigId: mockFormConfigId,
        initialData: { test: "data" },
      });

      expect(result.ok).toBe(true);
      expect(result.applicationId).toBe(mockApplicationId);
      expect(prisma.application.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrgId,
          formConfigId: mockFormConfigId,
          entityId: mockEntityId,
          geographyId: mockGeographyId,
          status: "DRAFT",
          data: { test: "data" },
          createdById: mockUserId,
          updatedById: mockUserId,
        },
      });
    });

    it("should require ADMIN/PROCUREMENT/MEMBER role", async () => {
      vi.mocked(requireRole).mockRejectedValue(
        new Error("Unauthorized: insufficient role")
      );

      await expect(
        createApplicationOnBehalfAction({
          organizationId: mockOrgId,
          formConfigId: mockFormConfigId,
        })
      ).rejects.toThrow("Unauthorized: insufficient role");
    });

    it("should reject unauthorized users", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      await expect(
        createApplicationOnBehalfAction({
          organizationId: mockOrgId,
          formConfigId: mockFormConfigId,
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("should prevent duplicate active applications", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: mockOrgId,
      } as any);

      vi.mocked(prisma.formConfig.findUnique).mockResolvedValue({
        id: mockFormConfigId,
        entityId: mockEntityId,
        geographyId: mockGeographyId,
      } as any);

      vi.mocked(prisma.application.findFirst).mockResolvedValue({
        id: "existing-app",
        status: "DRAFT",
      } as any);

      await expect(
        createApplicationOnBehalfAction({
          organizationId: mockOrgId,
          formConfigId: mockFormConfigId,
        })
      ).rejects.toThrow(
        "An active application already exists for this organization and form configuration"
      );
    });

    it("should create audit log entry", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: mockOrgId,
      } as any);

      vi.mocked(prisma.formConfig.findUnique).mockResolvedValue({
        id: mockFormConfigId,
        entityId: mockEntityId,
        geographyId: mockGeographyId,
      } as any);

      vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.application.create).mockResolvedValue({
        id: mockApplicationId,
      } as any);

      await createApplicationOnBehalfAction({
        organizationId: mockOrgId,
        formConfigId: mockFormConfigId,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          applicationId: mockApplicationId,
          actorId: mockUserId,
          actorRole: "PROCUREMENT",
          action: "APPLICATION_CREATED",
          details: {
            note: "Application created by internal team",
            createdBy: "INTERNAL",
          },
        },
      });
    });
  });

  describe("submitOnBehalfAction", () => {
    it("should submit DRAFT application successfully", async () => {
      const mockApplication = {
        id: mockApplicationId,
        status: "DRAFT" as ApplicationStatus,
        organizationId: mockOrgId,
        formConfigId: mockFormConfigId,
        formConfig: { id: mockFormConfigId },
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue(
        mockApplication as any
      );

      vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.application.update).mockResolvedValue({
        id: mockApplicationId,
        status: "SUBMITTED",
        submissionType: "INTERNAL",
      } as any);

      const result = await submitOnBehalfAction(mockApplicationId);

      expect(result.ok).toBe(true);
      expect(prisma.application.update).toHaveBeenCalledWith({
        where: { id: mockApplicationId },
        data: {
          status: "SUBMITTED",
          submittedAt: expect.any(Date),
          submittedById: mockUserId,
          submissionType: "INTERNAL",
          updatedById: mockUserId,
        },
      });
    });

    it("should submit PENDING_SUPPLIER application successfully", async () => {
      const mockApplication = {
        id: mockApplicationId,
        status: "PENDING_SUPPLIER" as ApplicationStatus,
        organizationId: mockOrgId,
        formConfigId: mockFormConfigId,
        formConfig: { id: mockFormConfigId },
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue(
        mockApplication as any
      );

      vi.mocked(prisma.application.update).mockResolvedValue({
        id: mockApplicationId,
        status: "SUBMITTED",
      } as any);

      const result = await submitOnBehalfAction(mockApplicationId);

      expect(result.ok).toBe(true);
      expect(prisma.application.update).toHaveBeenCalled();
    });

    it("should require ADMIN/PROCUREMENT/MEMBER role", async () => {
      vi.mocked(requireRole).mockRejectedValue(
        new Error("Unauthorized: insufficient role")
      );

      await expect(submitOnBehalfAction(mockApplicationId)).rejects.toThrow(
        "Unauthorized: insufficient role"
      );
    });

    it("should prevent submission from non-editable statuses", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: mockApplicationId,
        status: "SUBMITTED" as ApplicationStatus,
        formConfig: { id: mockFormConfigId },
      } as any);

      await expect(submitOnBehalfAction(mockApplicationId)).rejects.toThrow(
        "Cannot submit application in SUBMITTED status"
      );
    });

    it("should set submissionType to INTERNAL", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: mockApplicationId,
        status: "DRAFT" as ApplicationStatus,
        organizationId: mockOrgId,
        formConfigId: mockFormConfigId,
        formConfig: { id: mockFormConfigId },
      } as any);

      vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

      await submitOnBehalfAction(mockApplicationId);

      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submissionType: "INTERNAL",
          }),
        })
      );
    });

    it("should create audit log with submission type", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: mockApplicationId,
        status: "DRAFT" as ApplicationStatus,
        organizationId: mockOrgId,
        formConfigId: mockFormConfigId,
        formConfig: { id: mockFormConfigId },
      } as any);

      vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

      await submitOnBehalfAction(mockApplicationId);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "APPLICATION_SUBMITTED",
          details: expect.objectContaining({
            submissionType: "INTERNAL",
          }),
        }),
      });
    });

    it("should prevent duplicate submissions", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: mockApplicationId,
        status: "DRAFT" as ApplicationStatus,
        organizationId: mockOrgId,
        formConfigId: mockFormConfigId,
        formConfig: { id: mockFormConfigId },
      } as any);

      vi.mocked(prisma.application.findFirst).mockResolvedValue({
        id: "other-app",
        status: "DRAFT",
      } as any);

      await expect(submitOnBehalfAction(mockApplicationId)).rejects.toThrow(
        "An active application already exists"
      );
    });
  });

  describe("editDraftOnBehalfAction", () => {
    it("should edit DRAFT application successfully", async () => {
      const mockApplication = {
        id: mockApplicationId,
        status: "DRAFT" as ApplicationStatus,
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue(
        mockApplication as any
      );

      vi.mocked(prisma.application.update).mockResolvedValue({
        id: mockApplicationId,
      } as any);

      const result = await editDraftOnBehalfAction({
        applicationId: mockApplicationId,
        formData: { test: "updated" },
      });

      expect(result.ok).toBe(true);
      expect(prisma.application.update).toHaveBeenCalledWith({
        where: { id: mockApplicationId },
        data: {
          data: { test: "updated" },
          updatedById: mockUserId,
        },
      });
    });

    it("should edit PENDING_SUPPLIER application successfully", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: mockApplicationId,
        status: "PENDING_SUPPLIER" as ApplicationStatus,
      } as any);

      await editDraftOnBehalfAction({
        applicationId: mockApplicationId,
        formData: { test: "data" },
      });

      expect(prisma.application.update).toHaveBeenCalled();
    });

    it("should require ADMIN/PROCUREMENT/MEMBER role", async () => {
      vi.mocked(requireRole).mockRejectedValue(
        new Error("Unauthorized: insufficient role")
      );

      await expect(
        editDraftOnBehalfAction({
          applicationId: mockApplicationId,
          formData: {},
        })
      ).rejects.toThrow("Unauthorized: insufficient role");
    });

    it("should prevent editing from non-editable statuses", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: mockApplicationId,
        status: "SUBMITTED" as ApplicationStatus,
      } as any);

      await expect(
        editDraftOnBehalfAction({
          applicationId: mockApplicationId,
          formData: {},
        })
      ).rejects.toThrow("Cannot edit application in SUBMITTED status");
    });

    it("should create audit log entry", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: mockApplicationId,
        status: "DRAFT" as ApplicationStatus,
      } as any);

      await editDraftOnBehalfAction({
        applicationId: mockApplicationId,
        formData: { test: "data" },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          applicationId: mockApplicationId,
          actorId: mockUserId,
          actorRole: "PROCUREMENT",
          action: "APPLICATION_UPDATED",
          details: {
            note: "Application edited by internal team",
            editedBy: "INTERNAL",
          },
        },
      });
    });
  });
});

