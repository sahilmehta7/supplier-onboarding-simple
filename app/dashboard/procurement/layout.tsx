import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/permissions";

export default async function ProcurementLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireRole(["ADMIN", "PROCUREMENT"]);
  } catch {
    redirect("/");
  }

  return <>{children}</>;
}

