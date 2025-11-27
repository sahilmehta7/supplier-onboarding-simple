import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
    isSupplier,
    getSupplierApplication,
    getApplicationState,
    getAvailableFormConfigs,
    canStartNewApplication,
    requireSupplierRole,
    hasApplicationForEntityGeography,
} from "@/lib/supplier-access";

describe("supplier-access", () => {
    let testUserId: string;
    let testOrganizationId: string;
    let supplierUserId: string;
    let otherUserId: string;

    beforeEach(async () => {
        // Use unique values for each test run
        const uniqueId = Math.random().toString(36).substring(7);

        // Create test organization
        const org = await prisma.organization.create({
            data: {
                name: `Test Org ${uniqueId}`,
                slug: `test-org-${uniqueId}`,
            },
        });
        testOrganizationId = org.id;

        // Create supplier user
        const supplier = await prisma.user.create({
            data: {
                email: `supplier-${uniqueId}@test.com`,
                name: "Test Supplier",
            },
        });
        supplierUserId = supplier.id;

        await prisma.membership.create({
            data: {
                userId: supplierUserId,
                organizationId: testOrganizationId,
                role: "SUPPLIER",
            },
        });

        // Create non-supplier user
        const other = await prisma.user.create({
            data: {
                email: `admin-${uniqueId}@test.com`,
                name: "Test Admin",
            },
        });
        otherUserId = other.id;

        await prisma.membership.create({
            data: {
                userId: otherUserId,
                organizationId: testOrganizationId,
                role: "ADMIN",
            },
        });
    });

    describe("isSupplier", () => {
        it("should return true for users with SUPPLIER role", async () => {
            const result = await isSupplier(supplierUserId);
            expect(result).toBe(true);
        });

        it("should return false for users without SUPPLIER role", async () => {
            const result = await isSupplier(otherUserId);
            expect(result).toBe(false);
        });
    });

    describe("getSupplierApplication", () => {
        it("should return null when user has no applications", async () => {
            const result = await getSupplierApplication(supplierUserId);
            expect(result).toBeNull();
        });

        it("should return active (non-approved) application", async () => {
            const entity = await prisma.entity.create({
                data: { code: "TEST", name: "Test Entity" },
            });

            const geography = await prisma.geography.create({
                data: { code: "US", name: "United States" },
            });

            const app = await prisma.application.create({
                data: {
                    organizationId: testOrganizationId,
                    entityId: entity.id,
                    geographyId: geography.id,
                    status: "DRAFT",
                    createdById: supplierUserId,
                },
            });

            const result = await getSupplierApplication(supplierUserId);
            expect(result).not.toBeNull();
            expect(result?.id).toBe(app.id);
        });

        it("should not return approved applications", async () => {
            const entity = await prisma.entity.create({
                data: { code: "TEST", name: "Test Entity" },
            });

            const geography = await prisma.geography.create({
                data: { code: "US", name: "United States" },
            });

            await prisma.application.create({
                data: {
                    organizationId: testOrganizationId,
                    entityId: entity.id,
                    geographyId: geography.id,
                    status: "APPROVED",
                    createdById: supplierUserId,
                },
            });

            const result = await getSupplierApplication(supplierUserId);
            expect(result).toBeNull();
        });
    });

    describe("getApplicationState", () => {
        it("should return correct state for DRAFT application", async () => {
            const entity = await prisma.entity.create({
                data: { code: "TEST", name: "Test Entity" },
            });

            const geography = await prisma.geography.create({
                data: { code: "US", name: "United States" },
            });

            const app = await prisma.application.create({
                data: {
                    organizationId: testOrganizationId,
                    entityId: entity.id,
                    geographyId: geography.id,
                    status: "DRAFT",
                    createdById: supplierUserId,
                },
            });

            const appWithRelations = await prisma.application.findUnique({
                where: { id: app.id },
                include: { entity: true, geography: true, supplier: true },
            });

            const state = getApplicationState(appWithRelations!);

            expect(state.status).toBe("DRAFT");
            expect(state.canEdit).toBe(true);
            expect(state.canSubmit).toBe(true);
            expect(state.requiresAction).toBe(true);
            expect(state.actionText).toBe("Continue Application");
        });

        it("should return correct state for SUBMITTED application", async () => {
            const entity = await prisma.entity.create({
                data: { code: "TEST", name: "Test Entity" },
            });

            const geography = await prisma.geography.create({
                data: { code: "US", name: "United States" },
            });

            const app = await prisma.application.create({
                data: {
                    organizationId: testOrganizationId,
                    entityId: entity.id,
                    geographyId: geography.id,
                    status: "SUBMITTED",
                    createdById: supplierUserId,
                },
            });

            const appWithRelations = await prisma.application.findUnique({
                where: { id: app.id },
                include: { entity: true, geography: true, supplier: true },
            });

            const state = getApplicationState(appWithRelations!);

            expect(state.status).toBe("SUBMITTED");
            expect(state.canEdit).toBe(false);
            expect(state.canSubmit).toBe(false);
            expect(state.actionText).toBe("View Application");
        });
    });

    describe("canStartNewApplication", () => {
        it("should return true when user has no active applications", async () => {
            const result = await canStartNewApplication(supplierUserId);
            expect(result).toBe(true);
        });

        it("should return false when user has an active application", async () => {
            const entity = await prisma.entity.create({
                data: { code: "TEST", name: "Test Entity" },
            });

            const geography = await prisma.geography.create({
                data: { code: "US", name: "United States" },
            });

            await prisma.application.create({
                data: {
                    organizationId: testOrganizationId,
                    entityId: entity.id,
                    geographyId: geography.id,
                    status: "DRAFT",
                    createdById: supplierUserId,
                },
            });

            const result = await canStartNewApplication(supplierUserId);
            expect(result).toBe(false);
        });
    });

    describe("requireSupplierRole", () => {
        it("should not throw for users with SUPPLIER role", async () => {
            await expect(
                requireSupplierRole(supplierUserId)
            ).resolves.not.toThrow();
        });

        it("should throw for users without SUPPLIER role", async () => {
            await expect(requireSupplierRole(otherUserId)).rejects.toThrow(
                "Forbidden: SUPPLIER role required"
            );
        });
    });
});
