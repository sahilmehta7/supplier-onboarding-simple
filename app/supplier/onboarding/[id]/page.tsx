import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FormWizardClient } from "@/components/forms/form-wizard-client";
import { loadDraftRecord } from "@/lib/forms/draft-manager";
import { getFormConfigById } from "@/lib/forms/form-config-fetcher";

interface Params {
  id: string;
}

export default async function OnboardingWizardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Fetch application with organization check
  const application = await prisma.application.findFirst({
    where: {
      id,
      organization: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    include: {
      organization: true,
    },
  });

  if (!application) {
    notFound();
  }

  // Redirect to Company Profile if approved
  if (application.status === "APPROVED") {
    const supplier = await prisma.supplier.findUnique({
      where: { applicationId: application.id },
      select: { id: true },
    });

    if (supplier) {
      redirect(`/supplier/profile/${supplier.id}`);
    }
  }

  // Ensure we have a form config ID
  if (!application.formConfigId) {
    // This shouldn't happen for new applications, but handle legacy/error case
    notFound();
  }

  // Fetch the form config
  const formConfig = await getFormConfigById(application.formConfigId);

  if (!formConfig) {
    notFound();
  }

  // Load draft data
  const draftRecord = await loadDraftRecord({
    applicationId: application.id,
    organizationId: application.organizationId,
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
          organizationId={application.organizationId}
          initialData={draftRecord?.formData ?? {}}
          initialStep={draftRecord?.currentStep ?? 0}
          initialApplicationId={application.id}
          drafts={[]} // Single application context
        />
      </div>
    </div>
  );
}

