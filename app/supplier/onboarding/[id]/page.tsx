import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { OnboardingHeader } from "@/components/supplier/onboarding-header";
import { SupplierWizardForm } from "@/components/supplier/wizard-form";
import { DocumentUploader } from "@/components/supplier/document-uploader";
import { SubmissionBar } from "@/components/supplier/submission-bar";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";

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
    return null;
  }

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
      documents: true,
    },
  });

  if (!application) {
    notFound();
  }

  const emptyData: SupplierWizardData = {
    supplierInformation: {
      supplierName: "",
      paymentTerms: "Net 30",
      salesContactName: "",
      salesContactEmail: "",
    },
    addresses: {
      remitToAddress: { line1: "", city: "", country: "" },
      orderingAddressSameAsRemit: true,
    },
    bankInformation: {
      bankName: "",
      routingNumber: "",
      accountNumber: "",
    },
    documents: [],
  };

  const storedData =
    (application.data as SupplierWizardData | null | undefined) ?? null;

  const initialData: SupplierWizardData = storedData
    ? {
        ...emptyData,
        ...storedData,
        supplierInformation: {
          ...emptyData.supplierInformation,
          ...(storedData.supplierInformation ?? {}),
        },
        addresses: {
          ...emptyData.addresses,
          ...(storedData.addresses ?? {}),
          remitToAddress: {
            ...emptyData.addresses.remitToAddress,
            ...(storedData.addresses?.remitToAddress ?? {}),
          },
        },
        bankInformation: {
          ...emptyData.bankInformation,
          ...(storedData.bankInformation ?? {}),
        },
        documents: storedData.documents ?? [],
      }
    : emptyData;

  const completionChecks = [
    initialData.supplierInformation.supplierName,
    initialData.addresses.remitToAddress.line1,
    initialData.bankInformation.bankName,
    application.documents.length > 0,
  ];

  const progressValue = Math.round(
    (completionChecks.filter((value) => Boolean(value)).length /
      completionChecks.length) *
      100
  );

  return (
    <div className="space-y-8">
      <OnboardingHeader
        applicationId={application.id}
        status={application.status}
        updatedAt={application.updatedAt}
        progressValue={progressValue}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SupplierWizardForm
          applicationId={application.id}
          initialData={initialData}
        />
        <DocumentUploader applicationId={application.id} />
      </div>

      <SubmissionBar applicationId={application.id} />

      <Link
        href="/supplier"
        className="text-sm font-medium text-slate-900 underline underline-offset-4"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

