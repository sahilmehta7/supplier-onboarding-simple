import { prisma } from "@/lib/prisma";
import { Separator } from "@/components/ui/separator";
import { History } from "lucide-react";

export default async function AuditHistoryPage() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "ADMIN_ENTITY_CREATE",
          "ADMIN_ENTITY_UPDATE",
          "ADMIN_ENTITY_DELETE",
          "ADMIN_GEO_CREATE",
          "ADMIN_GEO_UPDATE",
          "ADMIN_GEO_DELETE",
          "ADMIN_FORM_CONFIG_CREATE",
          "ADMIN_FORM_CONFIG_UPDATE",
          "ADMIN_FORM_CONFIG_DELETE",
          "ADMIN_SECTION_CREATE",
          "ADMIN_SECTION_UPDATE",
          "ADMIN_SECTION_DELETE",
          "ADMIN_DOC_TYPE_CREATE",
          "ADMIN_DOC_TYPE_UPDATE",
          "ADMIN_DOC_TYPE_DELETE",
          "ADMIN_DOC_REQUIREMENT_SET",
          "ADMIN_DOC_REQUIREMENT_DELETE",
          "ADMIN_INTEGRATIONS_UPDATE",
          "SETTINGS_INTEGRATIONS_UPDATE",
        ],
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Audit history</h2>
        <p className="text-sm text-slate-500">
          Most recent admin configuration changes, pulled directly from the
          audit log.
        </p>
      </div>

      <div className="space-y-3">
        {logs.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No admin activity recorded yet.
          </p>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <History className="h-3.5 w-3.5" />
                {log.action}
              </div>
              <Separator orientation="vertical" className="hidden h-4 lg:block" />
              <span>{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}


