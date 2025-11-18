import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { ensureUserMembership } from "@/lib/organizations";
import { UserList } from "@/components/users/user-list";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) {
    redirect("/dashboard");
  }

  if (user.memberships.length === 0) {
    await ensureUserMembership({
      userId: user.id,
      userName: user.name,
      userEmail: user.email ?? undefined,
    });

    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  if (!user || user.memberships.length === 0) {
    redirect("/dashboard");
  }

  const activeMembership = user.memberships[0];
  const activeOrganization = activeMembership.organization;
  const canManage = await canManageUsers(activeOrganization.id);

  // Fetch all users in the organization
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: activeOrganization.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const users = memberships.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    image: membership.user.image,
    role: membership.role,
    joinedAt: membership.createdAt,
    membershipId: membership.id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage organization members and their roles
          </p>
        </div>
        {canManage && <InviteUserDialog organizationId={activeOrganization.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? "member" : "members"} in{" "}
            {activeOrganization.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserList users={users} currentUserId={session.user.id} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}

