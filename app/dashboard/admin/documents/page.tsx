import { prisma } from "@/lib/prisma";

import { DocumentCatalogTable } from "@/components/admin/document-catalog-table";

export default async function DocumentsPage() {
  const documents = await prisma.documentType.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });
  const documentSummaries = documents.map((doc) => ({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Document catalog
        </h2>
        <p className="text-sm text-slate-500">
          Maintain reusable document definitions referenced in requirements.
        </p>
      </div>
      <DocumentCatalogTable documents={documentSummaries} />
    </div>
  );
}


