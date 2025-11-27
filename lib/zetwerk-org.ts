import { prisma } from "@/lib/prisma";

/**
 * Ensures user has membership in the Zetwerk organization
 * Used for supplier signup flow in single-org mode
 */
export async function ensureZetwerkMembership(options: {
    userId: string;
    role?: "SUPPLIER" | "ADMIN" | "PROCUREMENT" | "MDM" | "MEMBER";
}) {
    const { userId, role = "SUPPLIER" } = options;

    // Find Zetwerk organization
    const zetwerkOrg = await prisma.organization.findUnique({
        where: { slug: "zetwerk" },
    });

    if (!zetwerkOrg) {
        throw new Error(
            "Zetwerk organization not found. Please run database consolidation script."
        );
    }

    // Check if user already has membership
    const existingMembership = await prisma.membership.findFirst({
        where: {
            userId,
            organizationId: zetwerkOrg.id,
        },
    });

    if (existingMembership) {
        return existingMembership;
    }

    // Create new membership
    const membership = await prisma.membership.create({
        data: {
            userId,
            organizationId: zetwerkOrg.id,
            role,
        },
    });

    return membership;
}

/**
 * Gets the Zetwerk organization
 * Returns null if not found
 */
export async function getZetwerkOrganization() {
    return await prisma.organization.findUnique({
        where: { slug: "zetwerk" },
    });
}
