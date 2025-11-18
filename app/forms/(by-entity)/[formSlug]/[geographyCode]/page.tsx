import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFormConfigByEntityAndGeography } from "@/lib/forms/form-config-fetcher";
import { FormWizardClient } from "@/components/forms/form-wizard-client";
import { getCurrentUserMembership } from "@/lib/permissions";
import {
  listDraftSummaries,
  loadDraftRecord,
} from "@/lib/forms/draft-manager";

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

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const membership = await getCurrentUserMembership();
  if (!membership) {
    redirect("/signin");
  }

  const formConfig = await getFormConfigByEntityAndGeography(
    entityCode,
    geographyCode
  );

  if (!formConfig) {
    notFound();
  }

  const drafts = await listDraftSummaries({
    formConfigId: formConfig.id,
    organizationId: membership.organizationId,
    entityId: formConfig.entityId,
    geographyId: formConfig.geographyId,
    userId: session.user.id,
  });

  const initialDraft =
    drafts.length > 0
      ? await loadDraftRecord({
          applicationId: drafts[0].applicationId,
          organizationId: membership.organizationId,
          userId: session.user.id,
        })
      : null;

  return (
    <div className="container mx-auto w-full max-w-5xl px-4 py-10">
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Responsive Wizard
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
          initialApplicationId={initialDraft?.applicationId ?? null}
          drafts={drafts}
        />
      </div>
    </div>
  );
}
