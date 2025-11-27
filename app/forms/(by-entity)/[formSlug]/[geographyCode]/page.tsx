import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFormConfigByEntityAndGeography } from "@/lib/forms/form-config-fetcher";
import { FormWizardClient } from "@/components/forms/form-wizard-client";
import { getCurrentUserMembership, isSupplier } from "@/lib/permissions";
import { loadDraftRecord } from "@/lib/forms/draft-manager";
import { getSupplierApplication } from "@/lib/supplier-access";
import { getOrCreateApplication } from "@/lib/application-manager";

interface Params {
  formSlug: string;
  geographyCode: string;
}

export default async function FormByEntityGeographyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { formSlug, geographyCode } = await params;
  const entityCode = formSlug;
  const session = await auth();

  // Check authentication - redirect to signin with callback URL
  if (!session?.user?.id) {
    const callbackUrl = `/forms/${entityCode}/${geographyCode}`;
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // Check SUPPLIER role - only suppliers can access forms
  const hasSupplierRole = await isSupplier();
  if (!hasSupplierRole) {
    redirect("/dashboard");
  }

  const membership = await getCurrentUserMembership();
  if (!membership) {
    redirect("/signin");
  }

  // Verify form config exists
  const formConfig = await getFormConfigByEntityAndGeography(
    entityCode,
    geographyCode
  );

  if (!formConfig) {
    notFound();
  }

  // Check for existing active application
  const activeApplication = await getSupplierApplication(session.user.id);

  // If user has an active application for a DIFFERENT entity/geography, block access
  if (
    activeApplication &&
    (activeApplication.entity.code !== entityCode ||
      activeApplication.geography.code !== geographyCode)
  ) {
    // Redirect to supplier dashboard with error indication
    redirect(
      `/supplier?error=${encodeURIComponent(
        "You already have an active application for " +
        activeApplication.entity.name +
        " - " +
        activeApplication.geography.name +
        ". Complete or withdraw it before starting a new one."
      )}`
    );
  }

  // Get or create application for this entity/geography
  const application = await getOrCreateApplication(
    session.user.id,
    entityCode,
    geographyCode
  );

  // Load draft data if exists
  const initialDraft = await loadDraftRecord({
    applicationId: application.id,
    organizationId: membership.organizationId,
    userId: session.user.id,
  });

  return (
    <div className="container mx-auto w-full max-w-5xl px-4 py-10">
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Supplier Onboarding
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            {formConfig.title || "Form Configuration"}
          </h1>
          {formConfig.description && (
            <p className="mt-2 text-base text-muted-foreground">
              {formConfig.description}
            </p>
          )}
        </header>
        <FormWizardClient
          formConfig={formConfig}
          organizationId={membership.organizationId}
          initialData={initialDraft?.formData ?? {}}
          initialStep={initialDraft?.currentStep ?? 0}
          initialApplicationId={application.id}
          drafts={[]} // Single application only
        />
      </div>
    </div>
  );
}
