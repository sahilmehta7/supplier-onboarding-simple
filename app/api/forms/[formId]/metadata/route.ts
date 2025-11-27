import { NextResponse } from "next/server";
import { getFormConfigById } from "@/lib/forms/form-config-fetcher";
import { calculateFormMetadata } from "@/lib/forms/form-metadata";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ formId: string }> }
) {
    const { formId } = await params;

    try {
        // Fetch form configuration
        const formConfig = await getFormConfigById(formId);

        if (!formConfig) {
            return NextResponse.json(
                { error: "Form configuration not found" },
                { status: 404 }
            );
        }

        // Calculate metadata
        const metadata = calculateFormMetadata(formConfig);

        // Build response
        const response = {
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
            sectionCount: metadata.sectionCount,
            totalFieldCount: metadata.totalFieldCount,
            requiredFieldCount: metadata.requiredFieldCount,
            estimatedTimeMinutes: metadata.estimatedTimeMinutes,
            sectionSummary: metadata.sectionSummary,
            documentRequirements: {
                required: metadata.requiredDocuments,
                optional: metadata.optionalDocuments,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching form metadata:", error);
        return NextResponse.json(
            { error: "Failed to fetch form metadata" },
            { status: 500 }
        );
    }
}
