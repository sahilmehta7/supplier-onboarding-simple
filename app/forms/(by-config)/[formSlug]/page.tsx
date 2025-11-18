import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFormConfigById } from "@/lib/forms/form-config-fetcher";
import { FormWizardClient } from "@/components/forms/form-wizard-client";
import { getCurrentUserMembership } from "@/lib/permissions";
import {
  listDraftSummaries,
  loadDraftRecord,
} from "@/lib/forms/draft-manager";

interface Params {
  formSlug: string;
}

export default async function FormByConfigIdPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { formSlug } = await params;
  const formConfigId = formSlug;
  const session = await auth();

  // Authentication check
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const membership = await getCurrentUserMembership();
  if (!membership) {
    redirect("/signin");
  }

  // Fetch form config
  const formConfig = await getFormConfigById(formConfigId);

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
          {!formConfig.isActive && (
            <p className="mt-2 text-sm text-amber-600">
              (This form configuration is inactive)
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

