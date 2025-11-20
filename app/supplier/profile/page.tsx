import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSuppliersForOrganization } from "@/lib/suppliers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SupplierProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Get user's organization
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (!membership) {
    redirect("/supplier");
  }

  const suppliers = await getSuppliersForOrganization(
    membership.organizationId,
    session.user.id
  );

  if (suppliers.length === 0) {
    redirect("/supplier");
  }

  if (suppliers.length === 1) {
    redirect(`/supplier/profile/${suppliers[0].id}`);
  }

  // Multiple suppliers - show selection page
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          Select Company Profile
        </h1>
        <p className="text-sm text-slate-500">
          You have multiple approved suppliers. Select one to view its profile.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {suppliers.map((supplier) => (
          <Link
            key={supplier.id}
            href={`/supplier/profile/${supplier.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-slate-300 transition"
          >
            <h3 className="font-semibold text-slate-900">
              {supplier.entity.name} - {supplier.geography.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Approved{" "}
              {supplier.application.approvedAt
                ? new Date(supplier.application.approvedAt).toLocaleDateString()
                : "Unknown"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

