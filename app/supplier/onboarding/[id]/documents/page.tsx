import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DocumentUploadPage } from "@/components/supplier/document-upload-page";
import { getFormConfigById } from "@/lib/forms/form-config-fetcher";
import { getDocumentRequirements } from "@/lib/forms/form-metadata";

interface Params {
    id: string;
}

export default async function OnboardingDocumentsPage({
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

    // Redirect if already approved
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
        notFound();
    }

    // Fetch the form config
    const formConfig = await getFormConfigById(application.formConfigId);

    if (!formConfig) {
        notFound();
    }

    // Get document requirements
    const documents = getDocumentRequirements(formConfig);

    return (
        <div className="container mx-auto w-full max-w-5xl px-4 py-10">
            <div className="space-y-6">
                <header>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Supplier Onboarding • Step 1 of {formConfig.sections.length + 1}
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold">
                        {formConfig.title || "Form Configuration"}
                    </h1>
                </header>
                <DocumentUploadPage
                    applicationId={application.id}
                    documents={documents}
                />
            </div>
        </div>
    );
}
