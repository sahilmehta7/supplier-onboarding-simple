import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSupplier } from "@/lib/permissions";

export default async function RootRedirect() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Check if user has SUPPLIER role
  const hasSupplierRole = await isSupplier();

  if (hasSupplierRole) {
    redirect("/supplier");
  }

  redirect("/dashboard");
}

