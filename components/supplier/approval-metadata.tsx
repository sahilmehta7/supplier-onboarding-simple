import { Card, CardContent } from "@/components/ui/card";

interface ApprovalMetadataProps {
  approvedAt: Date | null;
  approvedBy: { name: string | null; email: string | null };
}

export function ApprovalMetadata({
  approvedAt,
  approvedBy,
}: ApprovalMetadataProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2 text-sm">
          {approvedAt && (
            <div>
              <span className="font-medium text-slate-700">Approved on:</span>{" "}
              <span className="text-slate-900">
                {new Date(approvedAt).toLocaleDateString()} at{" "}
                {new Date(approvedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          {approvedBy.name && (
            <div>
              <span className="font-medium text-slate-700">Approved by:</span>{" "}
              <span className="text-slate-900">
                {approvedBy.name}
                {approvedBy.email && ` (${approvedBy.email})`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

