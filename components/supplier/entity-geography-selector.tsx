"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AvailableFormConfig } from "@/lib/supplier-access";

interface EntityGeographySelectorProps {
    formConfigs: AvailableFormConfig[];
}

export function EntityGeographySelector({
    formConfigs,
}: EntityGeographySelectorProps) {
    if (formConfigs.length === 0) {
        return (
            <Card className="shadow-none">
                <CardHeader>
                    <CardTitle>No Forms Available</CardTitle>
                    <CardDescription>
                        There are currently no active onboarding forms available. Please
                        contact your administrator.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    // Group by entity
    const groupedByEntity = formConfigs.reduce<
        Record<string, AvailableFormConfig[]>
    >((acc, config) => {
        if (!acc[config.entityCode]) {
            acc[config.entityCode] = [];
        }
        acc[config.entityCode].push(config);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">
                    Select Entity and Geography
                </h2>
                <p className="text-sm text-slate-500">
                    Choose the entity and geography for your onboarding application.
                </p>
            </div>

            <div className="space-y-6">
                {Object.entries(groupedByEntity).map(([entityCode, configs]) => (
                    <div key={entityCode} className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-700">
                            {configs[0].entityName}
                        </h3>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {configs.map((config) => (
                                <Link
                                    key={config.formConfigId}
                                    href={`/forms/${config.entityCode}/${config.geographyCode}`}
                                    className="group"
                                >
                                    <Card className="h-full shadow-none transition hover:border-slate-300 hover:shadow-sm">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">
                                                {config.geographyName}
                                            </CardTitle>
                                            {config.title && (
                                                <CardDescription className="text-xs">
                                                    {config.title}
                                                </CardDescription>
                                            )}
                                        </CardHeader>
                                        {config.description && (
                                            <CardContent>
                                                <p className="text-xs text-slate-600">
                                                    {config.description}
                                                </p>
                                            </CardContent>
                                        )}
                                        <CardContent className="pt-0">
                                            <span className="text-xs font-medium text-slate-900 underline group-hover:text-slate-700">
                                                Start Application →
                                            </span>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
