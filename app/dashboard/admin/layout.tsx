import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminConfigNav } from "@/components/navigation/admin-config-nav";
import { requireRole } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireRole(["ADMIN"]);
  } catch {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
          Admin console
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Configuration</h1>
        <p className="text-sm text-slate-500">
          Manage master data powering supplier onboarding.
        </p>
      </div>
      <AdminConfigNav />
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

