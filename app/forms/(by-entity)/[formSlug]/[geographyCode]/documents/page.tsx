import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFormConfigByEntityAndGeography } from "@/lib/forms/form-config-fetcher";
import { getCurrentUserMembership, isSupplier } from "@/lib/permissions";
import { getSupplierApplication } from "@/lib/supplier-access";
import { getOrCreateApplication } from "@/lib/application-manager";
import { ensureZetwerkMembership } from "@/lib/zetwerk-org";
import { getDocumentRequirements } from "@/lib/forms/form-metadata";
import { DocumentUploadPage } from "@/components/supplier/document-upload-page";

interface Params {
    formSlug: string;
    geographyCode: string;
}

export default async function FormDocumentsPage({
    params,
}: {
    params: Promise<Params>;
}) {
    const { formSlug, geographyCode } = await params;
    const entityCode = formSlug;
    const session = await auth();

    // Check authentication - redirect to signin with callback URL
    if (!session?.user?.id) {
        const callbackUrl = `/forms/${entityCode}/${geographyCode}/documents`;
        redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    // Ensure user has membership (auto-assign to Zetwerk for new suppliers)
    let membership = await getCurrentUserMembership();

    if (!membership) {
        try {
            await ensureZetwerkMembership({
                userId: session.user.id,
                role: "SUPPLIER",
            });
            // Refetch to get full object with organization relation
            membership = await getCurrentUserMembership();
        } catch (error) {
            console.error("Failed to assign membership:", error);
            redirect("/signin?error=membership_creation_failed");
        }
    }

    if (!membership) {
        redirect("/signin?error=membership_fetch_failed");
    }

    // Check SUPPLIER role - only suppliers can access forms
    const hasSupplierRole = await isSupplier();
    if (!hasSupplierRole) {
        redirect("/dashboard");
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
