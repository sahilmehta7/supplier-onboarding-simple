import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CommentThread } from "@/components/procurement/comment-thread";
import { ProcurementActionPanel } from "@/components/procurement/action-panel";

interface ProcurementDetailProps {
  params: Promise<{ id: string }>;
}

export default async function ProcurementDetailPage({
  params,
}: ProcurementDetailProps) {
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      organization: true,
      entity: true,
      geography: true,
      documents: {
        include: { documentType: true },
        orderBy: { uploadedAt: "desc" },
      },
      comments: {
        include: {
          author: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!application) {
    notFound();
  }

  const data = (application.data as SupplierWizardData | null) ?? null;

  const supplierInfoEntries = Object.entries(
    data?.supplierInformation ?? {}
  ).filter(([, value]) => Boolean(value));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Application #{application.id.slice(0, 6).toUpperCase()}
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            {application.organization?.name ?? "Unknown organization"}
          </h1>
          <p className="text-sm text-slate-500">
            {application.entity?.name} • {application.geography?.code}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {application.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Supplier information snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {supplierInfoEntries.length === 0 ? (
              <p>No supplier metadata captured yet.</p>
            ) : (
              supplierInfoEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <span className="capitalize text-slate-500">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span className="font-medium text-slate-900">
                    {String(value)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {application.documents.length === 0 ? (
                <p>No uploads yet.</p>
              ) : (
                application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <p className="font-medium text-slate-900">
                      {doc.documentType?.label ?? doc.documentTypeId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {doc.fileName} • Uploaded{" "}
                      {doc.uploadedAt.toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <ProcurementActionPanel
            applicationId={application.id}
            currentStatus={application.status}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {application.auditLogs.length === 0 ? (
            <p>No recent audit entries.</p>
          ) : (
            application.auditLogs.map((log) => {
              const note =
                log.details &&
                typeof log.details === "object" &&
                "note" in log.details
                  ? String(
                      (log.details as { note?: unknown }).note ?? ""
                    ).trim()
                  : "";
              return (
                <div key={log.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{log.createdAt.toLocaleString()}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{log.action}</span>
                  </div>
                  <p className="text-slate-900">
                    {note || "No details recorded."}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clarifications & comments</CardTitle>
        </CardHeader>
        <CardContent>
          <CommentThread
            applicationId={application.id}
            comments={application.comments}
          />
        </CardContent>
      </Card>
    </div>
  );
}

