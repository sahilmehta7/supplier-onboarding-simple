"use client";

import { useRouter } from "next/navigation";
import { Building2, Clock, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DocumentChecklistSimple, DocumentChecklistAccordion } from "./document-checklist";
import { PreparationCTABar, SidebarCTA } from "./preparation-cta-bar";
import type { DocumentRequirement } from "@/lib/forms/form-metadata";
import { markPrepViewed } from "@/lib/forms/preparation-state";

interface FormPreparationProps {
    formId: string;
    formUrl?: string; // URL to navigate to when starting the application
    title: string;
    description: string | null;
    entity: {
        code: string;
        name: string;
    };
    geography: {
        code: string;
        name: string;
    };
    estimatedTimeMinutes: number;
    sectionCount: number;
    sectionSummary: Array<{
        key: string;
        label: string;
        fieldCount: number;
        order: number;
    }>;
    requiredDocuments: DocumentRequirement[];
    optionalDocuments: DocumentRequirement[];
}

export function FormPreparation({
    formId,
    formUrl,
    title,
    description,
    entity,
    geography,
    estimatedTimeMinutes,
    sectionCount,
    sectionSummary,
    requiredDocuments,
    optionalDocuments,
}: FormPreparationProps) {
    const router = useRouter();

    const handleStartApplication = () => {
        // Mark preparation as viewed
        markPrepViewed(formId);
        // Navigate to form
        const targetUrl = formUrl || `/forms/${formId}`;
        router.push(targetUrl);
    };

    return (
        <>
            {/* Main Content Area */}
            <div className="container mx-auto max-w-7xl px-4 py-6 md:py-10">
                {/* Desktop: Two-column layout, Mobile: Single column */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Left Column - Main Content (Desktop: 2/3, Mobile: full width) */}
                    <div className="md:col-span-2 space-y-6 md:space-y-8">
                        {/* Header */}
                        <header className="space-y-4">
                            {/* Entity / Geography */}
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge variant="outline" className="gap-1.5">
                                    <Building2 className="h-3 w-3" />
                                    {entity.name}
                                </Badge>
                                <span className="text-muted-foreground">•</span>
                                <Badge variant="outline">{geography.name}</Badge>
                            </div>

                            {/* Title */}
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                                    {title}
                                </h1>
                                {description && (
                                    <p className="mt-2 text-base text-muted-foreground">
                                        {description}
                                    </p>
                                )}
                            </div>

                            {/* Time Estimate - Mobile Prominent */}
                            <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/20 md:hidden">
                                <Clock className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm font-semibold">
                                        Estimated Time: ~{estimatedTimeMinutes} minutes
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {sectionCount} sections • {requiredDocuments.length} required
                                        documents
                                    </p>
                                </div>
                            </div>
                        </header>

                        <Separator className="md:hidden" />

                        {/* Overview */}
                        <section className="space-y-3">
                            <h2 className="text-xl font-semibold">Before You Begin</h2>
                            <p className="text-muted-foreground">
                                This supplier onboarding form will collect essential information
                                about your company, banking details, and required compliance
                                documents. Please review the checklist below and gather all
                                necessary documents before starting.
                            </p>
                        </section>

                        <Separator />

                        {/* Required Documents */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FileCheck className="h-5 w-5 text-primary" />
                                    Required Documents
                                </h2>
                                <Badge variant="default" className="hidden md:flex">
                                    {requiredDocuments.length} items
                                </Badge>
                            </div>

                            {/* Desktop: Simple list, Mobile: Accordion */}
                            <div className="hidden md:block">
                                <DocumentChecklistSimple
                                    documents={requiredDocuments}
                                    variant="required"
                                />
                            </div>
                            <div className="md:hidden">
                                <DocumentChecklistAccordion
                                    documents={requiredDocuments}
                                    variant="required"
                                />
                            </div>
                        </section>

                        {/* Optional Documents */}
                        {optionalDocuments.length > 0 && (
                            <>
                                <Separator />
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-semibold flex items-center gap-2">
                                            Optional Documents
                                        </h2>
                                        <Badge variant="secondary" className="hidden md:flex">
                                            {optionalDocuments.length} items
                                        </Badge>
                                    </div>

                                    {/* Desktop: Simple list, Mobile: Accordion */}
                                    <div className="hidden md:block">
                                        <DocumentChecklistSimple
                                            documents={optionalDocuments}
                                            variant="optional"
                                        />
                                    </div>
                                    <div className="md:hidden">
                                        <DocumentChecklistAccordion
                                            documents={optionalDocuments}
                                            variant="optional"
                                        />
                                    </div>
                                </section>
                            </>
                        )}

                        {/* Mobile Spacing for Bottom Bar */}
                        <div className="h-24 md:hidden" aria-hidden="true" />
                    </div>

                    {/* Right Column - Sidebar (Desktop only) */}
                    <div className="md:col-span-1">
                        <SidebarCTA
                            onStartApplication={handleStartApplication}
                            requiredDocCount={requiredDocuments.length}
                            optionalDocCount={optionalDocuments.length}
                            estimatedTimeMinutes={estimatedTimeMinutes}
                            formTitle={title}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile: Fixed Bottom CTA */}
            <PreparationCTABar
                onStartApplication={handleStartApplication}
                formTitle={title}
                variant="mobile"
            />
        </>
    );
}
