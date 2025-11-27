/**
 * Form metadata calculation utilities
 * Calculates estimated completion time and extracts metadata from form configuration
 */

import type { FormConfigWithFields } from "./types";

export interface DocumentRequirement {
    key: string;
    label: string;
    category: string;
    description: string | null;
    helpText: string | null;
    required: boolean;
}

export interface FormMetadata {
    estimatedTimeMinutes: number;
    sectionCount: number;
    totalFieldCount: number;
    requiredFieldCount: number;
    sectionSummary: Array<{
        key: string;
        label: string;
        fieldCount: number;
        order: number;
    }>;
    requiredDocuments: DocumentRequirement[];
    optionalDocuments: DocumentRequirement[];
}

/**
 * Calculate form metadata including estimated completion time
 * 
 * Formula: baseTime(5min) + (fieldCount × 0.5min) + (requiredDocCount × 1min)
 */
export function calculateFormMetadata(
    formConfig: FormConfigWithFields
): FormMetadata {
    const sections = formConfig.sections;
    const documentRules = formConfig.documentRules;

    // Calculate field counts
    const totalFieldCount = sections.reduce(
        (sum, section) => sum + section.fields.length,
        0
    );

    const requiredFieldCount = sections.reduce(
        (sum, section) =>
            sum + section.fields.filter((field) => field.required).length,
        0
    );

    // Separate required and optional documents
    const requiredDocuments: DocumentRequirement[] = [];
    const optionalDocuments: DocumentRequirement[] = [];

    documentRules.forEach((rule) => {
        const docReq: DocumentRequirement = {
            key: rule.documentType.key,
            label: rule.documentType.label,
            category: rule.documentType.category,
            description: rule.documentType.description,
            helpText: rule.helpText,
            required: rule.required,
        };

        if (rule.required) {
            requiredDocuments.push(docReq);
        } else {
            optionalDocuments.push(docReq);
        }
    });

    // Calculate estimated time
    // Base: 5 minutes
    // Each field: 30 seconds (0.5 minutes)
    // Each required document: 1 minute
    const baseTimeMinutes = 5;
    const fieldTimeMinutes = totalFieldCount * 0.5;
    const docTimeMinutes = requiredDocuments.length * 1;
    const estimatedTimeMinutes = Math.ceil(
        baseTimeMinutes + fieldTimeMinutes + docTimeMinutes
    );

    // Build section summary
    const sectionSummary = sections.map((section) => ({
        key: section.key,
        label: section.label,
        fieldCount: section.fields.length,
        order: section.order,
    }));

    return {
        estimatedTimeMinutes,
        sectionCount: sections.length,
        totalFieldCount,
        requiredFieldCount,
        sectionSummary: sectionSummary.sort((a, b) => a.order - b.order),
        requiredDocuments,
        optionalDocuments,
    };
}

/**
 * Group documents by category
 */
export function groupDocumentsByCategory(
    documents: DocumentRequirement[]
): Map<string, DocumentRequirement[]> {
    const grouped = new Map<string, DocumentRequirement[]>();

    documents.forEach((doc) => {
        const category = doc.category || "other";
        if (!grouped.has(category)) {
            grouped.set(category, []);
        }
        grouped.get(category)!.push(doc);
    });

    return grouped;
}

/**
 * Format category name for display
 */
export function formatCategoryName(category: string): string {
    const categoryMap: Record<string, string> = {
        tax: "Tax & Compliance",
        banking: "Banking Information",
        kyc: "KYC Documents",
        financials: "Financial Statements",
        factory_profile: "Factory & Facilities",
        marketing: "Marketing & Branding",
        compliance: "Compliance & Legal",
        other: "Other Documents",
    };

    return categoryMap[category] || category;
}

/**
 * Get all document requirements from form config
 */
export function getDocumentRequirements(
    formConfig: FormConfigWithFields
): DocumentRequirement[] {
    return formConfig.documentRules.map((rule) => ({
        key: rule.documentType.key,
        label: rule.documentType.label,
        category: rule.documentType.category,
        description: rule.documentType.description,
        helpText: rule.helpText,
        required: rule.required,
    }));
}

