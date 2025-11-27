import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getSupplierApplication,
  getApplicationState,
  getAvailableFormConfigs,
} from "@/lib/supplier-access";
import { EntityGeographySelector } from "@/components/supplier/entity-geography-selector";
import { ApplicationStatusCard } from "@/components/supplier/application-status-card";

export default async function SupplierDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Get error message if any
  const { error } = await searchParams;

  // Get user's active application
  const activeApplication = await getSupplierApplication(session.user.id);

  // If user has an approved application with supplier profile, redirect there
  if (
    activeApplication?.status === "APPROVED" &&
    activeApplication.supplier
  ) {
    redirect(`/supplier/profile/${activeApplication.supplier.id}`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Supplier Workspace
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Welcome back
        </h1>
        {activeApplication ? (
          <p className="text-sm text-slate-500">
            View and manage your onboarding application.
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Select an entity and geography to begin your onboarding application.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Notice</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      {activeApplication ? (
        // Show application status card
        <ApplicationStatusCard
          applicationState={getApplicationState(activeApplication)}
        />
      ) : (
        // Show entity/geography selector
        <EntityGeographySelector
          formConfigs={await getAvailableFormConfigs()}
        />
      )}
    </div>
  );
}

