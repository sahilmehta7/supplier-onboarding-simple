import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isSupplier } from "@/lib/permissions";
import { ensureZetwerkMembership } from "@/lib/zetwerk-org";

export default async function SupplierLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Enforce SUPPLIER role
  const hasSupplierRole = await isSupplier();
  if (!hasSupplierRole) {
    redirect("/dashboard");
  }

  // Ensure user is in Zetwerk organization (single-tenant mode)
  try {
    await ensureZetwerkMembership({
      userId: session.user.id,
      role: "SUPPLIER",
    });
  } catch (error) {
    console.error("Failed to ensure Zetwerk membership:", error);
    // Continue anyway - user might already be in org
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-8 px-4 md:px-8">
        {children}
      </div>
    </div>
  );
}
