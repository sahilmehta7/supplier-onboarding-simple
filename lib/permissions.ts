import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getCurrentUserWithMembership() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return user;
}

export async function getCurrentUserMembership(organizationId?: string) {
  const user = await getCurrentUserWithMembership();
  if (!user) {
    return null;
  }

  if (organizationId) {
    return user.memberships.find((m) => m.organizationId === organizationId);
  }

  return user.memberships[0] ?? null;
}

export async function isAdmin(organizationId?: string): Promise<boolean> {
  const membership = await getCurrentUserMembership(organizationId);
  return membership?.role === "ADMIN" || false;
}

export async function canManageUsers(
  organizationId?: string
): Promise<boolean> {
  return isAdmin(organizationId);
}

export async function requireAdmin(organizationId?: string) {
  const isUserAdmin = await isAdmin(organizationId);
  if (!isUserAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
}

export async function requireRole(
  roles: string[],
  organizationId?: string
) {
  const membership = await getCurrentUserMembership(organizationId);
  if (!membership || !roles.includes(membership.role)) {
    throw new Error("Unauthorized: insufficient role");
  }
  return membership;
}

export async function isSupplier(organizationId?: string): Promise<boolean> {
  const membership = await getCurrentUserMembership(organizationId);
  return membership?.role === "SUPPLIER" || false;
}

export async function requireSupplierRole(organizationId?: string) {
  const isUserSupplier = await isSupplier(organizationId);
  if (!isUserSupplier) {
    throw new Error("Unauthorized: SUPPLIER role required");
  }
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Authentication required");
  }
  return session;
}

/**
 * Validates that a user has access to an application
 * Checks if user is creator or belongs to the application's organization
 */
export async function validateApplicationAccess(
  applicationId: string,
  userId: string
): Promise<boolean> {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      OR: [
        { createdById: userId },
        {
          organization: {
            members: {
              some: { userId },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return !!application;
}

/**
 * Requires that a user has access to an application
 * Throws error if access is denied
 */
export async function requireApplicationAccess(
  applicationId: string,
  userId: string
): Promise<void> {
  const hasAccess = await validateApplicationAccess(applicationId, userId);
  if (!hasAccess) {
    throw new Error("Forbidden: Access to this application is not allowed");
  }
}

/**
 * Validates that a user has access to a document
 * Checks document ownership through application access
 */
export async function validateDocumentAccess(
  fileId: string,
  userId: string
): Promise<boolean> {
  const document = await prisma.applicationDocument.findFirst({
    where: {
      fileUrl: fileId,
      OR: [
        { uploadedById: userId },
        {
          application: {
            organization: {
              members: {
                some: { userId },
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return !!document;
}

/**
 * Requires that a user has access to a document
 * Throws error if access is denied
 */
export async function requireDocumentAccess(
  fileId: string,
  userId: string
): Promise<void> {
  const hasAccess = await validateDocumentAccess(fileId, userId);
  if (!hasAccess) {
    throw new Error("Forbidden: Access to this document is not allowed");
  }
}

/**
 * Gets user's organization membership
 * Validates user belongs to specified organization
 */
export async function requireOrganizationMembership(
  organizationId: string,
  userId: string
) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  if (!membership) {
    throw new Error("Forbidden: Not a member of this organization");
  }

  return membership;
}

