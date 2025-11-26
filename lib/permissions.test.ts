import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
    validateApplicationAccess,
    requireApplicationAccess,
    validateDocumentAccess,
    requireDocumentAccess,
    requireOrganizationMembership,
} from "./permissions";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
    prisma: {
        application: {
            findFirst: vi.fn(),
        },
        applicationDocument: {
            findFirst: vi.fn(),
        },
        membership: {
            findFirst: vi.fn(),
        },
    },
}));

describe("validateApplicationAccess", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return true when user is creator", async () => {
        vi.mocked(prisma.application.findFirst).mockResolvedValue({
            id: "app-1",
        } as any);

        const result = await validateApplicationAccess("app-1", "user-1");

        expect(result).toBe(true);
        expect(prisma.application.findFirst).toHaveBeenCalledWith({
            where: {
                id: "app-1",
                OR: [
                    { createdById: "user-1" },
                    {
                        organization: {
                            members: {
                                some: { userId: "user-1" },
                            },
                        },
                    },
                ],
            },
            select: { id: true },
        });
    });

    it("should return false when user has no access", async () => {
        vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

        const result = await validateApplicationAccess("app-1", "user-1");

        expect(result).toBe(false);
    });
});

describe("requireApplicationAccess", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should not throw when user has access", async () => {
        vi.mocked(prisma.application.findFirst).mockResolvedValue({
            id: "app-1",
        } as any);

        await expect(
            requireApplicationAccess("app-1", "user-1")
        ).resolves.not.toThrow();
    });

    it("should throw when user has no access", async () => {
        vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

        await expect(requireApplicationAccess("app-1", "user-1")).rejects.toThrow(
            "Forbidden: Access to this application is not allowed"
        );
    });
});

describe("validateDocumentAccess", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return true when user uploaded the document", async () => {
        vi.mocked(prisma.applicationDocument.findFirst).mockResolvedValue({
            id: "doc-1",
        } as any);

        const result = await validateDocumentAccess("file-1", "user-1");

        expect(result).toBe(true);
        expect(prisma.applicationDocument.findFirst).toHaveBeenCalledWith({
            where: {
                fileUrl: "file-1",
                OR: [
                    { uploadedById: "user-1" },
                    {
                        application: {
                            organization: {
                                members: {
                                    some: { userId: "user-1" },
                                },
                            },
                        },
                    },
                ],
            },
            select: { id: true },
        });
    });

    it("should return false when user has no access", async () => {
        vi.mocked(prisma.applicationDocument.findFirst).mockResolvedValue(null);

        const result = await validateDocumentAccess("file-1", "user-1");

        expect(result).toBe(false);
    });
});

describe("requireDocumentAccess", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should not throw when user has access", async () => {
        vi.mocked(prisma.applicationDocument.findFirst).mockResolvedValue({
            id: "doc-1",
        } as any);

        await expect(
            requireDocumentAccess("file-1", "user-1")
        ).resolves.not.toThrow();
    });

    it("should throw when user has no access", async () => {
        vi.mocked(prisma.applicationDocument.findFirst).mockResolvedValue(null);

        await expect(requireDocumentAccess("file-1", "user-1")).rejects.toThrow(
            "Forbidden: Access to this document is not allowed"
        );
    });
});

describe("requireOrganizationMembership", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return membership when user is member", async () => {
        const mockMembership = {
            id: "mem-1",
            userId: "user-1",
            organizationId: "org-1",
            role: "MEMBER",
        };

        vi.mocked(prisma.membership.findFirst).mockResolvedValue(
            mockMembership as any
        );

        const result = await requireOrganizationMembership("org-1", "user-1");

        expect(result).toEqual(mockMembership);
    });

    it("should throw when user is not a member", async () => {
        vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);

        await expect(
            requireOrganizationMembership("org-1", "user-1")
        ).rejects.toThrow("Forbidden: Not a member of this organization");
    });
});
