import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "@/components/navigation/user-menu";
import { prisma } from "@/lib/prisma";
import { ensureUserMembership } from "@/lib/organizations";
import { isSupplier } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Block SUPPLIER users from internal dashboard
  const hasSupplierRole = await isSupplier();
  if (hasSupplierRole) {
    redirect("/supplier");
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

  // DISABLED: Auto-org creation for multi-tenant preparation
  // All users should be manually added to organizations
  // if (user && user.memberships.length === 0) {
  //   ...
  // }

  // Block access if no membership exists
  if (!user || user.memberships.length === 0) {
    // Redirect to supplier page where they might get auto-assigned if they have a pending application
    // Or just redirect to signin if they are truly lost
    redirect("/supplier");
  }

  const activeOrganization = user?.memberships[0]?.organization;
  const organizationName = activeOrganization?.name ?? "Supplier Hub";

  return (
    <SidebarProvider>
      <AppSidebar organizationName={organizationName} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {organizationName}
              </span>
            </div>
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              image={session.user.image}
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
