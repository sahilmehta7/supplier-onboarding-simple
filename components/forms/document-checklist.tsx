"use client";

import { FileText, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import type { DocumentRequirement } from "@/lib/forms/form-metadata";
import {
    groupDocumentsByCategory,
    formatCategoryName,
} from "@/lib/forms/form-metadata";

interface DocumentChecklistProps {
    documents: DocumentRequirement[];
    variant: "required" | "optional";
    groupByCategory?: boolean;
}

export function DocumentChecklist({
    documents,
    variant,
    groupByCategory = true,
}: DocumentChecklistProps) {
    if (documents.length === 0) {
        return null;
    }

    const isRequired = variant === "required";

    if (!groupByCategory) {
        return (
            <div className="space-y-3">
                {documents.map((doc) => (
                    <DocumentCard key={doc.key} document={doc} isRequired={isRequired} />
                ))}
            </div>
        );
    }

    // Group by category
    const grouped = groupDocumentsByCategory(documents);
    const categories = Array.from(grouped.keys()).sort();

    return (
        <div className="space-y-4">
            {categories.map((category) => {
                const categoryDocs = grouped.get(category)!;
                return (
                    <div key={category} className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {formatCategoryName(category)}
                        </h4>
                        <div className="space-y-3">
                            {categoryDocs.map((doc) => (
                                <DocumentCard
                                    key={doc.key}
                                    document={doc}
                                    isRequired={isRequired}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

interface DocumentCardProps {
    document: DocumentRequirement;
    isRequired: boolean;
}

function DocumentCard({ document, isRequired }: DocumentCardProps) {
    const hasAdditionalInfo = document.description || document.helpText;

    return (
        <Card className="border-l-4" style={{ borderLeftColor: isRequired ? "hsl(var(--primary))" : "hsl(var(--muted))" }}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h4 className="font-medium text-sm leading-tight">
                                {document.label}
                            </h4>
                            <Badge
                                variant={isRequired ? "default" : "secondary"}
                                className="text-xs flex-shrink-0"
                            >
                                {isRequired ? "Required" : "Optional"}
                            </Badge>
                        </div>

                        {document.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {document.description}
                            </p>
                        )}

                        {document.helpText && (
                            <div className="mt-2 flex items-start gap-2 rounded-md bg-muted/50 p-2">
                                <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground">
                                    {document.helpText}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Mobile-optimized accordion version
export function DocumentChecklistAccordion({
    documents,
    variant,
}: Omit<DocumentChecklistProps, "groupByCategory">) {
    if (documents.length === 0) {
        return null;
    }

    const grouped = groupDocumentsByCategory(documents);
    const categories = Array.from(grouped.keys()).sort();
    const isRequired = variant === "required";

    return (
        <Accordion type="multiple" className="w-full">
            {categories.map((category) => {
                const categoryDocs = grouped.get(category)!;
                return (
                    <AccordionItem key={category} value={category}>
                        <AccordionTrigger className="text-sm font-semibold">
                            <div className="flex items-center justify-between w-full pr-2">
                                <span>{formatCategoryName(category)}</span>
                                <Badge variant="outline" className="text-xs ml-2">
                                    {categoryDocs.length}
                                </Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 pt-2">
                                {categoryDocs.map((doc) => (
                                    <DocumentCard
                                        key={doc.key}
                                        document={doc}
                                        isRequired={isRequired}
                                    />
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
}

// Simple list variant for compact, clean display
export function DocumentChecklistSimple({
    documents,
    variant,
}: Omit<DocumentChecklistProps, "groupByCategory">) {
    if (documents.length === 0) {
        return null;
    }

    const isRequired = variant === "required";
    const grouped = groupDocumentsByCategory(documents);
    const categories = Array.from(grouped.keys()).sort();

    return (
        <div className="space-y-6">
            {categories.map((category) => {
                const categoryDocs = grouped.get(category)!;
                return (
                    <div key={category} className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {formatCategoryName(category)}
                        </h4>
                        <ul className="space-y-2">
                            {categoryDocs.map((doc) => (
                                <li
                                    key={doc.key}
                                    className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                                >
                                    <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                            <p className="font-medium text-sm">{doc.label}</p>
                                            {isRequired && (
                                                <Badge variant="default" className="text-xs">
                                                    Required
                                                </Badge>
                                            )}
                                        </div>
                                        {doc.helpText && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {doc.helpText}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}
