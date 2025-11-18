import { prisma } from "@/lib/prisma";

import { GeographyTable } from "@/components/admin/geographies-table";

export default async function GeographiesPage() {
  const geographies = await prisma.geography.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Geography directory
        </h2>
        <p className="text-sm text-slate-500">
          Track every region or market supported in onboarding flows.
        </p>
      </div>
      <GeographyTable geographies={geographies} />
    </div>
  );
}


