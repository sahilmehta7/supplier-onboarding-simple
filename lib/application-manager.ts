import { prisma } from "@/lib/prisma";
import type { Application } from "@prisma/client";
import { getFormConfigByEntityAndGeography } from "./forms/form-config-fetcher";

/**
 * Create a new supplier application for the given entity/geography
 */
export async function createSupplierApplication(
    userId: string,
    entityCode: string,
    geographyCode: string
): Promise<Application> {
    // Get user's membership
    const membership = await prisma.membership.findFirst({
        where: { userId },
    });

    if (!membership) {
        throw new Error("User does not have organization membership");
    }

    // Get entity and geography
    const entity = await prisma.entity.findUnique({
        where: { code: entityCode },
    });

    if (!entity) {
        throw new Error(`Entity not found: ${entityCode}`);
    }

    const geography = await prisma.geography.findUnique({
        where: { code: geographyCode },
    });

    if (!geography) {
        throw new Error(`Geography not found: ${geographyCode}`);
    }

    // Verify form config exists
    const formConfig = await getFormConfigByEntityAndGeography(
        entityCode,
        geographyCode
    );

    if (!formConfig) {
        throw new Error(
            `No active form configuration found for ${entityCode}/${geographyCode}`
        );
    }

    // Create the application
    const application = await prisma.application.create({
        data: {
            organizationId: membership.organizationId,
            entityId: entity.id,
            geographyId: geography.id,
            formConfigId: formConfig.id,
            status: "DRAFT",
            createdById: userId,
        },
    });

    return application;
}

/**
 * Get existing application or create new one for entity/geography
 * Returns existing if found, creates new draft otherwise
 */
export async function getOrCreateApplication(
    userId: string,
    entityCode: string,
    geographyCode: string
): Promise<Application> {
    // Get user's membership
    const membership = await prisma.membership.findFirst({
        where: { userId },
    });

    if (!membership) {
        throw new Error("User does not have organization membership");
    }

    // Check for existing application
    const existingApplication = await prisma.application.findFirst({
        where: {
            organizationId: membership.organizationId,
            createdById: userId,
            entity: { code: entityCode },
            geography: { code: geographyCode },
            status: {
                in: ["DRAFT", "SUBMITTED", "IN_REVIEW", "PENDING_SUPPLIER"],
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

    if (existingApplication) {
        return existingApplication;
    }

    // Create new application
    return createSupplierApplication(userId, entityCode, geographyCode);
}

/**
 * Check if an application can be edited
 * Only DRAFT applications are editable
 */
export function canEditApplication(application: Application): boolean {
    return application.status === "DRAFT";
}

/**
 * Require that an application is editable by the user
 * Throws error if not editable
 */
export async function requireEditableApplication(
    applicationId: string,
    userId: string
): Promise<Application> {
    const application = await prisma.application.findUnique({
        where: { id: applicationId },
    });

    if (!application) {
        throw new Error("Application not found");
    }

    // Check ownership
    if (application.createdById !== userId) {
        throw new Error("Forbidden: You do not own this application");
    }

    // Check if editable
    if (!canEditApplication(application)) {
        throw new Error(
            `Application cannot be edited. Current status: ${application.status}`
        );
    }

    return application;
}
