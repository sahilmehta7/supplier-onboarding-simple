import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSupplierForUser } from "@/lib/suppliers";
import { CompanyProfile } from "@/components/supplier/company-profile";

interface Params {
  supplierId: string;
}

export default async function SupplierProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { supplierId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const supplier = await getSupplierForUser(supplierId, session.user.id);

  if (!supplier) {
    notFound();
  }

  return <CompanyProfile supplier={supplier} />;
}

