import { prisma } from "@/lib/prisma";

import { FormDefinitionsPanel } from "@/components/admin/form-definitions-panel";

export default async function FormDefinitionsPage() {
  const [forms, entities, geographies] = await Promise.all([
    prisma.formConfig.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        entity: true,
        geography: true,
        sections: {
          orderBy: [{ order: "asc" }],
          include: {
            fields: {
              orderBy: [{ order: "asc" }],
            },
          },
        },
        documentRules: {
          orderBy: [{ documentType: { label: "asc" } }],
          include: {
            documentType: true,
          },
        },
      },
    }),
    prisma.entity.findMany({ orderBy: { name: "asc" } }),
    prisma.geography.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Form definitions
        </h2>
        <p className="text-sm text-slate-500">
          Control entity + geography specific onboarding schema versions.
        </p>
      </div>
      <FormDefinitionsPanel forms={forms} entities={entities} geographies={geographies} />
    </div>
  );
}


