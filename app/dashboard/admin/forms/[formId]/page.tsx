import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { FormDefinitionEditor } from "@/components/admin/form-definition-editor";

interface FormDefinitionEditPageProps {
  params: Promise<{ formId: string }>;
}

export default async function FormDefinitionEditPage({
  params,
}: FormDefinitionEditPageProps) {
  const { formId } = await params;

  const [form, documentTypes] = await Promise.all([
    prisma.formConfig.findUnique({
      where: { id: formId },
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
          include: { documentType: true },
        },
      },
    }),
    prisma.documentType.findMany({ orderBy: { label: "asc" } }),
  ]);

  if (!form) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Configure form definition
        </h2>
        <p className="text-sm text-slate-500">
          Edit sections, fields, and required documents in one place.
        </p>
      </div>
      <FormDefinitionEditor form={form} documentTypes={documentTypes} />
    </div>
  );
}


