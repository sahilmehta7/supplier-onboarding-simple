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

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Authentication required");
  }
  return session;
}

