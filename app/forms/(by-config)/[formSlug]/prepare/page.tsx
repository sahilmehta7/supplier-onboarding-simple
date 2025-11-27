import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentUserMembership } from "@/lib/permissions";

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

    // Fetch form metadata
    const metadataUrl = new URL(
        `/api/forms/${formConfigId}/metadata`,
        process.env.NEXTAUTH_URL || "http://localhost:3000"
    );

    const response = await fetch(metadataUrl.toString());

    if (!response.ok) {
        if (response.status === 404) {
            notFound();
        }
        throw new Error("Failed to fetch form  metadata");
    }

    const metadata = await response.json();

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
