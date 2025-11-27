"use client";

import { Clock, FileText, Building2, Info, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface SectionSummary {
    key: string;
    label: string;
    fieldCount: number;
    order: number;
}

interface PreparationInfoSectionsProps {
    sections: SectionSummary[];
    estimatedTimeMinutes: number;
    className?: string;
}

export function PreparationInfoSections({
    sections,
    estimatedTimeMinutes,
    className,
}: PreparationInfoSectionsProps) {
    return (
        <div className={className}>
            {/* Desktop: Grid of cards */}
            <div className="hidden md:block space-y-6">
                <WhatYouNeedCard sections={sections} />
                <ImportantNotesCard />
                <SaveResumeCard estimatedTimeMinutes={estimatedTimeMinutes} />
            </div>

            {/* Mobile: Accordion */}
            <div className="md:hidden">
                <Accordion type="multiple" className="w-full">
                    <AccordionItem value="what-you-need">
                        <AccordionTrigger className="text-sm font-semibold">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                What Information You'll Need
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <WhatYouNeedContent sections={sections} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="important-notes">
                        <AccordionTrigger className="text-sm font-semibold">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                Important Notes & Tips
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <ImportantNotesContent />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="save-resume">
                        <AccordionTrigger className="text-sm font-semibold">
                            <div className="flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                Save & Resume
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <SaveResumeContent estimatedTimeMinutes={estimatedTimeMinutes} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}

// Desktop Card Components
function WhatYouNeedCard({ sections }: { sections: SectionSummary[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    What Information You'll Need
                </CardTitle>
            </CardHeader>
            <CardContent>
                <WhatYouNeedContent sections={sections} />
            </CardContent>
        </Card>
    );
}

function ImportantNotesCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Info className="h-5 w-5" />
                    Important Notes & Tips
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ImportantNotesContent />
            </CardContent>
        </Card>
    );
}

function SaveResumeCard({
    estimatedTimeMinutes,
}: {
    estimatedTimeMinutes: number;
}) {
    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Save className="h-5 w-5" />
                    Save & Resume Anytime
                </CardTitle>
            </CardHeader>
            <CardContent>
                <SaveResumeContent estimatedTimeMinutes={estimatedTimeMinutes} />
            </CardContent>
        </Card>
    );
}

// Shared Content Components
function WhatYouNeedContent({ sections }: { sections: SectionSummary[] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sections.map((section) => (
                <div
                    key={section.key}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                    <Building2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{section.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {section.fieldCount} {section.fieldCount === 1 ? "field" : "fields"}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ImportantNotesContent() {
    const notes = [
        {
            icon: FileText,
            text: "Ensure all documents are in PDF format (maximum size: 10MB per file)",
        },
        {
            icon: Info,
            text: "Have your tax identification numbers ready (GST, PAN, TAN)",
        },
        {
            icon: Building2,
            text: "Bank account details should match your cancelled cheque exactly",
        },
        {
            icon: Clock,
            text: "All information should match your official legal documents",
        },
    ];

    return (
        <ul className="space-y-3">
            {notes.map((note, index) => {
                const Icon = note.icon;
                return (
                    <li key={index} className="flex items-start gap-3">
                        <Icon className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{note.text}</p>
                    </li>
                );
            })}
        </ul>
    );
}

function SaveResumeContent({
    estimatedTimeMinutes,
}: {
    estimatedTimeMinutes: number;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">
                    Estimated completion time: ~{estimatedTimeMinutes} minutes
                </p>
            </div>
            <p className="text-sm text-muted-foreground">
                Your progress is automatically saved as you complete each section. You
                can return anytime using this link to continue where you left off.
            </p>
            <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> You don't need to complete the entire form in
                    one session. Save your draft and gather any missing documents before
                    final submission.
                </p>
            </div>
        </div>
    );
}
