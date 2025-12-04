import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentUserMembership } from "@/lib/permissions";
import { getFormConfigById } from "@/lib/forms/form-config-fetcher";
import { calculateFormMetadata } from "@/lib/forms/form-metadata";

interface Params {
    formSlug: string;
}

export default async function FormPreparePage({
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

    // Fetch form config directly (no HTTP round-trip)
    const formConfig = await getFormConfigById(formConfigId);

    if (!formConfig) {
        notFound();
    }

    // Calculate metadata directly
    const calculatedMetadata = calculateFormMetadata(formConfig);

    // Build metadata object
    const metadata = {
        id: formConfig.id,
        title: formConfig.title,
        description: formConfig.description,
        entity: {
            code: formConfig.entity.code,
            name: formConfig.entity.name,
        },
        geography: {
            code: formConfig.geography.code,
            name: formConfig.geography.name,
        },
        sectionCount: calculatedMetadata.sectionCount,
        totalFieldCount: calculatedMetadata.totalFieldCount,
        requiredFieldCount: calculatedMetadata.requiredFieldCount,
        estimatedTimeMinutes: calculatedMetadata.estimatedTimeMinutes,
        sectionSummary: calculatedMetadata.sectionSummary,
        documentRequirements: {
            required: calculatedMetadata.requiredDocuments,
            optional: calculatedMetadata.optionalDocuments,
        },
    };

    // Dynamic import to avoid SSR issues with client component
    const { FormPreparation } = await import(
        "@/components/forms/form-preparation"
    );

    return (
        <FormPreparation
            formId={metadata.id}
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
