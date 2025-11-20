import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createSupplierFromApplication,
  updateSupplierFromApplication,
  getSupplierForUser,
  getSuppliersForOrganization,
  createUpdateApplication,
} from "@/lib/suppliers";
import { prisma } from "@/lib/prisma";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    supplier: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    supplierDocument: {
      deleteMany: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
  },
}));

describe("suppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSupplierFromApplication", () => {
    it("should create a Supplier when Application is approved", async () => {
      const mockApplication = {
        id: "app-1",
        status: "APPROVED",
        organizationId: "org-1",
        entityId: "entity-1",
        geographyId: "geo-1",
        data: { supplierInformation: { supplierName: "Test Supplier" } },
        documents: [
          {
            documentTypeId: "doc-type-1",
            fileName: "test.pdf",
            fileUrl: "https://example.com/test.pdf",
            mimeType: "application/pdf",
            fileSize: 1024,
            uploadedAt: new Date(),
          },
        ],
        organization: { name: "Test Org" },
        entity: { name: "Test Entity" },
        geography: { name: "Test Geography" },
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue(
        mockApplication as any
      );
      vi.mocked(prisma.supplier.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.supplier.create).mockResolvedValue({
        id: "supplier-1",
        ...mockApplication,
        documents: [],
      } as any);

      const result = await createSupplierFromApplication("app-1");

      expect(prisma.application.findUnique).toHaveBeenCalledWith({
        where: { id: "app-1" },
        include: {
          documents: true,
          organization: true,
          entity: true,
          geography: true,
        },
      });
      expect(prisma.supplier.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should return existing Supplier if already created", async () => {
      const existingSupplier = {
        id: "supplier-1",
        applicationId: "app-1",
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: "app-1",
        status: "APPROVED",
      } as any);
      vi.mocked(prisma.supplier.findUnique).mockResolvedValue(
        existingSupplier as any
      );

      const result = await createSupplierFromApplication("app-1");

      expect(result).toBe(existingSupplier);
      expect(prisma.supplier.create).not.toHaveBeenCalled();
    });

    it("should throw error if Application is not approved", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: "app-1",
        status: "DRAFT",
      } as any);

      await expect(createSupplierFromApplication("app-1")).rejects.toThrow(
        "Application must be APPROVED to create Supplier"
      );
    });

    it("should throw error if Application not found", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue(null);

      await expect(createSupplierFromApplication("app-1")).rejects.toThrow(
        "Application not found"
      );
    });
  });

  describe("updateSupplierFromApplication", () => {
    it("should update Supplier when update Application is approved", async () => {
      const mockApplication = {
        id: "app-2",
        status: "APPROVED",
        supplierId: "supplier-1",
        data: { supplierInformation: { supplierName: "Updated Supplier" } },
        documents: [
          {
            documentTypeId: "doc-type-1",
            fileName: "updated.pdf",
            fileUrl: "https://example.com/updated.pdf",
            mimeType: "application/pdf",
            fileSize: 2048,
            uploadedAt: new Date(),
          },
        ],
        supplier: { id: "supplier-1" },
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue(
        mockApplication as any
      );
      vi.mocked(prisma.supplierDocument.deleteMany).mockResolvedValue({
        count: 1,
      });
      vi.mocked(prisma.supplier.update).mockResolvedValue({
        id: "supplier-1",
        data: mockApplication.data,
        documents: [],
      } as any);

      const result = await updateSupplierFromApplication("app-2");

      expect(prisma.supplierDocument.deleteMany).toHaveBeenCalledWith({
        where: { supplierId: "supplier-1" },
      });
      expect(prisma.supplier.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw error if Application not linked to Supplier", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValue({
        id: "app-2",
        status: "APPROVED",
        supplierId: null,
      } as any);

      await expect(updateSupplierFromApplication("app-2")).rejects.toThrow(
        "Application must be linked to a Supplier for updates"
      );
    });
  });

  describe("getSupplierForUser", () => {
    it("should return Supplier if user is member of organization", async () => {
      const mockSupplier = {
        id: "supplier-1",
        organization: { members: [{ userId: "user-1" }] },
      };

      vi.mocked(prisma.supplier.findFirst).mockResolvedValue(
        mockSupplier as any
      );

      const result = await getSupplierForUser("supplier-1", "user-1");

      expect(prisma.supplier.findFirst).toHaveBeenCalledWith({
        where: {
          id: "supplier-1",
          organization: {
            members: { some: { userId: "user-1" } },
          },
        },
        include: expect.any(Object),
      });
      expect(result).toBe(mockSupplier);
    });
  });

  describe("getSuppliersForOrganization", () => {
    it("should return suppliers for organization if user is member", async () => {
      const mockMembership = {
        userId: "user-1",
        organizationId: "org-1",
      };
      const mockSuppliers = [
        {
          id: "supplier-1",
          organizationId: "org-1",
          entity: { name: "Entity 1" },
          geography: { name: "Geography 1" },
          application: { id: "app-1", status: "APPROVED", approvedAt: new Date() },
        },
      ];

      vi.mocked(prisma.membership.findUnique).mockResolvedValue(
        mockMembership as any
      );
      vi.mocked(prisma.supplier.findMany).mockResolvedValue(
        mockSuppliers as any
      );

      const result = await getSuppliersForOrganization("org-1", "user-1");

      expect(prisma.membership.findUnique).toHaveBeenCalled();
      expect(prisma.supplier.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockSuppliers);
    });

    it("should throw error if user is not member of organization", async () => {
      vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);

      await expect(
        getSuppliersForOrganization("org-1", "user-1")
      ).rejects.toThrow("User is not a member of this organization");
    });
  });

  describe("createUpdateApplication", () => {
    it("should create update Application for Supplier", async () => {
      const mockSupplier = {
        id: "supplier-1",
        organizationId: "org-1",
        entityId: "entity-1",
        geographyId: "geo-1",
        data: {
          supplierInformation: { supplierName: "Original Name" },
          addresses: { remitToAddress: { line1: "123 Main St" } },
          bankInformation: { bankName: "Bank" },
        },
        organization: {
          members: [{ userId: "user-1" }],
        },
        application: {
          formConfigId: "config-1",
          formConfig: { id: "config-1" },
        },
      };

      vi.mocked(prisma.supplier.findUnique).mockResolvedValue(
        mockSupplier as any
      );
      vi.mocked(prisma.application.create).mockResolvedValue({
        id: "app-update-1",
        status: "DRAFT",
        supplierId: "supplier-1",
      } as any);

      const updatedData = {
        supplierInformation: { supplierName: "Updated Name" },
      };

      const result = await createUpdateApplication(
        "supplier-1",
        "user-1",
        updatedData
      );

      expect(prisma.application.create).toHaveBeenCalled();
      expect(result.id).toBe("app-update-1");
      expect(result.supplierId).toBe("supplier-1");
    });

    it("should throw error if Supplier not found", async () => {
      vi.mocked(prisma.supplier.findUnique).mockResolvedValue(null);

      await expect(
        createUpdateApplication("supplier-1", "user-1", {})
      ).rejects.toThrow("Supplier not found");
    });

    it("should throw error if user is not member of organization", async () => {
      vi.mocked(prisma.supplier.findUnique).mockResolvedValue({
        id: "supplier-1",
        organization: { members: [] },
      } as any);

      await expect(
        createUpdateApplication("supplier-1", "user-1", {})
      ).rejects.toThrow("User is not a member of this organization");
    });
  });
});

