import { Badge } from "@/components/ui/badge";
import { User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionSourceBadgeProps {
  submissionType: "SUPPLIER" | "INTERNAL" | null;
  submittedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export function SubmissionSourceBadge({
  submissionType,
  submittedBy,
}: SubmissionSourceBadgeProps) {
  if (!submissionType) {
    return (
      <span className="text-sm text-slate-400">—</span>
    );
  }

  const isInternal = submissionType === "INTERNAL";
  const displayName = submittedBy?.name ?? submittedBy?.email ?? "Unknown";

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={isInternal ? "default" : "secondary"}
        className={cn(
          "rounded-full text-xs",
          isInternal && "bg-blue-100 text-blue-700 hover:bg-blue-100"
        )}
      >
        {isInternal ? (
          <Building2 className="mr-1 h-3 w-3" />
        ) : (
          <User className="mr-1 h-3 w-3" />
        )}
        {isInternal ? "Internal" : "Supplier"}
      </Badge>
      <span className="text-xs text-slate-500">{displayName}</span>
    </div>
  );
}

