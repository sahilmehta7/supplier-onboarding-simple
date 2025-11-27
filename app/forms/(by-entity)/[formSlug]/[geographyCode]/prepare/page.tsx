import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentUserMembership } from "@/lib/permissions";
import { getFormConfigByEntityAndGeography } from "@/lib/forms/form-config-fetcher";

interface Params {
    formSlug: string;
    geographyCode: string;
}

export default async function FormPreparePage({
    params,
}: {
    params: Promise<Params>;
}) {
    const { formSlug, geographyCode } = await params;
    const entityCode = formSlug;
    const session = await auth();

    // Authentication check
    if (!session?.user?.id) {
        const callbackUrl = `/forms/${entityCode}/${geographyCode}/prepare`;
        redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    const membership = await getCurrentUserMembership();
    if (!membership) {
        redirect("/signin");
    }

    // Fetch form config
    const formConfig = await getFormConfigByEntityAndGeography(
        entityCode,
        geographyCode
    );

    if (!formConfig) {
        notFound();
    }

    // Fetch form metadata
    const metadataUrl = new URL(
        `/api/forms/${formConfig.id}/metadata`,
        process.env.NEXTAUTH_URL || "http://localhost:3005"
    );

    const response = await fetch(metadataUrl.toString());

    if (!response.ok) {
        if (response.status === 404) {
            notFound();
        }
        throw new Error("Failed to fetch form metadata");
    }

    const metadata = await response.json();

    // Dynamic import to avoid SSR issues with client component
    const { FormPreparation } = await import(
        "@/components/forms/form-preparation"
    );

    return (
        <FormPreparation
            formId={metadata.id}
            formUrl={`/forms/${entityCode}/${geographyCode}`}
            title={metadata.title || "Form Configuration"}
            description={metadata.description}
            entity={metadata.entity}
            geography={metadata.geography}
            estimatedTimeMinutes={metadata.estimatedTimeMinutes}
            sectionCount={metadata.sectionCount}
            sectionSummary={metadata.sectionSummary}
            requiredDocuments={metadata.documentRequirements.required}
            optionalDocuments={metadata.documentRequirements.optional}
        />
    );
}
