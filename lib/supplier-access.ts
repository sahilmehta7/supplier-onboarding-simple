import { prisma } from "@/lib/prisma";
import type { Application, Entity, Geography, Supplier } from "@prisma/client";

export interface ApplicationState {
    status: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "PENDING_SUPPLIER" | "APPROVED" | "REJECTED";
    canEdit: boolean;
    canSubmit: boolean;
    canView: boolean;
    requiresAction: boolean;
    actionText: string;
    application: Application & {
        entity: Entity;
        geography: Geography;
        supplier?: Supplier | null;
    };
}

export interface AvailableFormConfig {
    entityCode: string;
    entityName: string;
    geographyCode: string;
    geographyName: string;
    formConfigId: string;
    title?: string | null;
    description?: string | null;
}

/**
 * Check if a user has the SUPPLIER role
 */
export async function isSupplier(userId: string): Promise<boolean> {
    const membership = await prisma.membership.findFirst({
        where: {
            userId,
            role: "SUPPLIER",
        },
    });

    return !!membership;
}

/**
 * Get a supplier user's active application (any non-approved status)
 * Returns null if no active application exists
 */
export async function getSupplierApplication(
    userId: string
): Promise<
    | (Application & {
        entity: Entity;
        geography: Geography;
        supplier?: Supplier | null;
    })
    | null
> {
    const membership = await prisma.membership.findFirst({
        where: { userId },
    });

    if (!membership) {
        return null;
    }

    // Get the most recent application that is not approved
    // Once approved, a new application can be started
    const application = await prisma.application.findFirst({
        where: {
            organizationId: membership.organizationId,
            createdById: userId,
            status: {
                in: ["DRAFT", "SUBMITTED", "IN_REVIEW", "PENDING_SUPPLIER", "REJECTED"],
            },
        },
        include: {
            entity: true,
            geography: true,
            supplier: true,
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

    return application;
}

/**
 * Get structured application state with allowed actions
 */
export function getApplicationState(
    application: Application & {
        entity: Entity;
        geography: Geography;
        supplier?: Supplier | null;
    }
): ApplicationState {
    const status = application.status;

    // Determine permissions based on status
    const canEdit = status === "DRAFT";
    const canSubmit = status === "DRAFT";
    const canView = true; // Can always view own application

    let requiresAction = false;
    let actionText = "";

    switch (status) {
        case "DRAFT":
            requiresAction = true;
            actionText = "Continue Application";
            break;
        case "SUBMITTED":
            actionText = "View Application";
            break;
        case "IN_REVIEW":
            actionText = "View Status";
            break;
        case "PENDING_SUPPLIER":
            requiresAction = true;
            actionText = "Action Required";
            break;
        case "APPROVED":
            actionText = "View Profile";
            break;
        case "REJECTED":
            requiresAction = true;
            actionText = "Start New Application";
            break;
    }

    return {
        status,
        canEdit,
        canSubmit,
        canView,
        requiresAction,
        actionText,
        application,
    };
}

/**
 * Get all available form configurations (entity/geography combinations)
 * Returns only active configurations
 */
export async function getAvailableFormConfigs(): Promise<
    AvailableFormConfig[]
> {
    const configs = await prisma.formConfig.findMany({
        where: {
            isActive: true,
        },
        include: {
            entity: true,
            geography: true,
        },
        orderBy: [{ entity: { name: "asc" } }, { geography: { name: "asc" } }],
    });

    return configs.map((config) => ({
        entityCode: config.entity.code,
        entityName: config.entity.name,
        geographyCode: config.geography.code,
        geographyName: config.geography.name,
        formConfigId: config.id,
        title: config.title,
        description: config.description,
    }));
}

/**
 * Check if user can start a new application
 * Returns false if user already has an active (non-approved) application
 */
export async function canStartNewApplication(
    userId: string
): Promise<boolean> {
    const activeApplication = await getSupplierApplication(userId);
    return !activeApplication;
}

/**
 * Require that user has SUPPLIER role
 * Throws error if not a supplier
 */
export async function requireSupplierRole(userId: string): Promise<void> {
    const hasSupplierRole = await isSupplier(userId);

    if (!hasSupplierRole) {
        throw new Error("Forbidden: SUPPLIER role required");
    }
}

/**
 * Check if a user has an active application for a specific entity/geography
 */
export async function hasApplicationForEntityGeography(
    userId: string,
    entityCode: string,
    geographyCode: string
): Promise<boolean> {
    const membership = await prisma.membership.findFirst({
        where: { userId },
    });

    if (!membership) {
        return false;
    }

    const application = await prisma.application.findFirst({
        where: {
            organizationId: membership.organizationId,
            createdById: userId,
            entity: { code: entityCode },
            geography: { code: geographyCode },
            status: {
                in: ["DRAFT", "SUBMITTED", "IN_REVIEW", "PENDING_SUPPLIER"],
            },
        },
    });

    return !!application;
}
