import { prisma } from "@/lib/prisma";

import { EntityTable } from "@/components/admin/entities-table";

export default async function EntitiesPage() {
  const entities = await prisma.entity.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Entity directory
        </h2>
        <p className="text-sm text-slate-500">
          Canonical list of legal entities you onboard suppliers against.
        </p>
      </div>
      <EntityTable entities={entities} />
    </div>
  );
}


