"use client";

import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PreparationCTABarProps {
    onStartApplication: () => void;
    formTitle?: string;
    variant?: "desktop" | "mobile";
    className?: string;
}

export function PreparationCTABar({
    onStartApplication,
    formTitle,
    variant = "desktop",
    className,
}: PreparationCTABarProps) {
    if (variant === "mobile") {
        return (
            <div
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg md:hidden",
                    "safe-area-inset-bottom",
                    className
                )}
            >
                <div className="p-4">
                    <Button
                        onClick={onStartApplication}
                        size="lg"
                        className="w-full text-base font-semibold"
                    >
                        Start Application
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </div>
        );
    }

    // Desktop variant - sticky sidebar
    return (
        <div className={cn("space-y-4", className)}>
            <Button
                onClick={onStartApplication}
                size="lg"
                className="w-full text-base font-semibold"
            >
                Start Application
                <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
                variant="outline"
                size="default"
                className="w-full"
                onClick={() => window.print()}
            >
                <Download className="mr-2 h-4 w-4" />
                Download Checklist
            </Button>

            {formTitle && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                    {formTitle}
                </p>
            )}
        </div>
    );
}

// Desktop sidebar with sticky behavior
interface SidebarCTAProps {
    onStartApplication: () => void;
    requiredDocCount: number;
    optionalDocCount: number;
    estimatedTimeMinutes: number;
    formTitle?: string;
}

export function SidebarCTA({
    onStartApplication,
    requiredDocCount,
    optionalDocCount,
    estimatedTimeMinutes,
    formTitle,
}: SidebarCTAProps) {
    return (
        <div className="hidden md:block">
            <div className="sticky top-6 space-y-4">
                {/* Main CTA Card */}
                <div className="rounded-lg border bg-card p-6 space-y-6 shadow-sm">
                    {/* Quick Summary */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg">Quick Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                    Required Documents:
                                </span>
                                <span className="font-semibold">{requiredDocCount}</span>
                            </div>
                            {optionalDocCount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">
                                        Optional Documents:
                                    </span>
                                    <span className="font-medium text-muted-foreground">
                                        {optionalDocCount}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-muted-foreground">
                                    Estimated Time:
                                </span>
                                <span className="font-semibold">
                                    ~{estimatedTimeMinutes} min
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <PreparationCTABar
                        onStartApplication={onStartApplication}
                        formTitle={formTitle}
                        variant="desktop"
                    />

                    {/* Help Text */}
                    <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                            Need help? Contact our support team for assistance with your
                            application.
                        </p>
                    </div>
                </div>

                {/* Important Notes */}
                <div className="rounded-lg border bg-muted/50 p-5 space-y-3">
                    <h4 className="font-semibold text-sm">Important Notes</h4>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Documents should be in PDF format (max 10MB)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Have your tax IDs ready (GST, PAN, TAN)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Bank details must match cancelled cheque</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>All info should match legal documents</span>
                        </li>
                    </ul>
                </div>

                {/* Save & Resume */}
                <div className="rounded-lg border bg-primary/5 border-primary/20 p-5 space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span>💾</span> Auto-Save Enabled
                    </h4>
                    <p className="text-xs text-muted-foreground">
                        Your progress is saved automatically. Return anytime to continue
                        where you left off.
                    </p>
                </div>
            </div>
        </div>
    );
}
