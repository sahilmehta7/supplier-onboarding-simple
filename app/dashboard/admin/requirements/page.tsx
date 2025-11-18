import { prisma } from "@/lib/prisma";

import { DocumentRequirementsPanel } from "@/components/admin/document-requirements-panel";

export default async function RequirementsPage() {
  const [requirements, forms, documents] = await Promise.all([
    prisma.formDocumentRequirement.findMany({
      orderBy: [
        { formConfig: { entity: { name: "asc" } } },
        { formConfig: { geography: { code: "asc" } } },
        { formConfig: { version: "desc" } },
        { documentType: { label: "asc" } },
      ],
      include: {
        formConfig: {
          include: {
            entity: true,
            geography: true,
          },
        },
        documentType: true,
      },
    }),
    prisma.formConfig.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        entity: true,
        geography: true,
      },
    }),
    prisma.documentType.findMany({
      orderBy: [{ label: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Document requirements
        </h2>
        <p className="text-sm text-slate-500">
          Map documents to specific form definitions and manage their metadata.
        </p>
      </div>
      <DocumentRequirementsPanel
        requirements={requirements}
        forms={forms}
        documents={documents}
      />
    </div>
  );
}


