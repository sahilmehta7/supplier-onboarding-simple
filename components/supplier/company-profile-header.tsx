import { Badge } from "@/components/ui/badge";
import { Entity, Geography } from "@prisma/client";

interface CompanyProfileHeaderProps {
  supplierName: string;
  entity: { name: string };
  geography: { name: string };
  approvedAt: Date | null;
}

export function CompanyProfileHeader({
  supplierName,
  entity,
  geography,
  approvedAt,
}: CompanyProfileHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {supplierName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {entity.name} • {geography.name}
          </p>
        </div>
        <Badge variant="default" className="bg-green-100 text-green-800">
          Approved
        </Badge>
      </div>
      {approvedAt && (
        <p className="text-sm text-slate-500">
          Approved on {new Date(approvedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

