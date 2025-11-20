import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Paperclip, MessageSquare, Clock, User, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CommentThread } from "@/components/procurement/comment-thread";
import { DetailTabs } from "@/components/procurement/detail-tabs";
import { StickyActionBar } from "@/components/procurement/sticky-action-bar";
import { BackToListLink } from "@/components/procurement/back-to-list-link";
import {
  getSubmissionDetail,
  type SubmissionAttachment,
  type SubmissionDetail,
  type SubmissionSection,
  type SubmissionActivityEntry,
  type SubmissionComment,
} from "@/lib/procurement/submissions";

interface ProcurementDetailProps {
  params: Promise<{ id: string }>;
}

export default async function ProcurementDetailPage({
  params,
}: ProcurementDetailProps) {
  const { id } = await params;

  const submission = await getSubmissionDetail(id);

  if (!submission) {
    notFound();
  }

  const sectionBuckets = bucketSections(submission.sections);
  const tabItems = buildTabs(submission, sectionBuckets);
  const defaultTab = tabItems[0]?.id ?? "overview";

  return (
    <div className="space-y-6 pb-32">
      <BackToListLink />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Application #{submission.id.slice(0, 6).toUpperCase()}
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            {submission.organizationName ?? "Unknown organization"}
          </h1>
          <p className="text-sm text-slate-500">
            {submission.entity.name} • {submission.geography.code}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {submission.status}
        </Badge>
      </div>

      <DetailTabs tabs={tabItems} defaultTabId={defaultTab} />

      <StickyActionBar
        applicationId={submission.id}
        currentStatus={submission.status}
      />
    </div>
  );
}

function buildTabs(
  submission: SubmissionDetail,
  buckets: SectionBuckets
) {
  const tabs: { id: string; label: string; content: ReactNode; badge?: ReactNode }[] =
    [
      {
        id: "overview",
        label: "Overview",
        content: <OverviewTab submission={submission} />,
      },
    ];

  if (buckets.profile.length) {
    tabs.push({
      id: "company",
      label: "Company Profile",
      content: <SectionGroup sections={buckets.profile} />,
    });
  }
  if (buckets.financials.length) {
    tabs.push({
      id: "financials",
      label: "Financials",
      content: <SectionGroup sections={buckets.financials} />,
    });
  }
  if (buckets.compliance.length) {
    tabs.push({
      id: "compliance",
      label: "Compliance",
      content: <SectionGroup sections={buckets.compliance} />,
    });
  }
  if (buckets.banking.length) {
    tabs.push({
      id: "banking",
      label: "Banking",
      content: <SectionGroup sections={buckets.banking} />,
    });
  }
  if (buckets.contacts.length) {
    tabs.push({
      id: "contacts",
      label: "Contacts",
      content: <SectionGroup sections={buckets.contacts} />,
    });
  }

  tabs.push({
    id: "attachments",
    label: "Attachments",
    badge:
      submission.attachments.length > 0 ? (
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {submission.attachments.length}
        </Badge>
      ) : undefined,
    content: <AttachmentsTab attachments={submission.attachments} />,
  });

  tabs.push({
    id: "activity",
    label: "Activity",
    content: (
      <ActivityTab
        applicationId={submission.id}
        activity={submission.activity}
        comments={submission.comments}
      />
    ),
  });

  return tabs;
}

function OverviewTab({ submission }: { submission: SubmissionDetail }) {
  const summary = [
    {
      label: "Status",
      value: (
        <Badge variant="secondary" className="rounded-full">
          {submission.status}
        </Badge>
      ),
    },
    {
      label: "Submitted",
      value: submission.submittedAt
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(submission.submittedAt)
        : "—",
    },
    {
      label: "Submitted By",
      value: submission.submissionType === "INTERNAL" ? (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-blue-100 text-blue-700">
            <Building2 className="mr-1 h-3 w-3" />
            Internal Team
          </Badge>
          <span className="text-sm text-slate-600">
            {submission.submittedBy?.name ?? submission.submittedBy?.email ?? "Unknown"}
          </span>
        </div>
      ) : submission.submissionType === "SUPPLIER" ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <User className="mr-1 h-3 w-3" />
            Supplier
          </Badge>
          <span className="text-sm text-slate-600">
            {submission.submittedBy?.name ?? submission.submittedBy?.email ?? "Unknown"}
          </span>
        </div>
      ) : (
        "—"
      ),
    },
    {
      label: "Last updated",
      value: new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(submission.updatedAt),
    },
    {
      label: "Entity",
      value: `${submission.entity.name} (${submission.entity.code})`,
    },
    {
      label: "Geography",
      value: `${submission.geography.name} (${submission.geography.code})`,
    },
    {
      label: "Owner",
      value: submission.owner?.name ?? submission.owner?.email ?? "Unassigned",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Supplier summary
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Review the tabs to inspect business, banking, compliance, and document
          details exactly as submitted by the supplier.
        </p>
      </div>
    </div>
  );
}

function SectionGroup({ sections }: { sections: SubmissionSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="text-sm text-slate-500">No information captured yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.id} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {section.label}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <div
                key={field.id}
                className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {field.label}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatFieldValue(field.value, field.isSensitive)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AttachmentsTab({
  attachments,
}: {
  attachments: SubmissionAttachment[];
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-slate-500">No documents uploaded.</p>;
  }

  return (
    <div className="grid gap-4">
      {attachments.map((doc) => (
        <div
          key={doc.id}
          className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {doc.type.label}
            </p>
            <p className="text-xs text-slate-500">
              {doc.fileName} • Uploaded{" "}
              {doc.uploadedAt.toLocaleDateString()}{" "}
              {doc.uploadedBy
                ? `by ${doc.uploadedBy.name ?? doc.uploadedBy.email ?? "User"}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full text-xs">
              {doc.mimeType ?? "file"}
            </Badge>
            {doc.previewUrl && (
              <a
                href={doc.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-1 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Preview
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityTab({
  applicationId,
  activity,
  comments,
}: {
  applicationId: string;
  activity: SubmissionActivityEntry[];
  comments: SubmissionComment[];
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">No recorded activity.</p>
        ) : (
          activity.map((entry) => (
            <div
              key={entry.id}
              className="flex gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
            >
              <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                {entry.type === "comment" ? (
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                ) : (
                  <Clock className="h-4 w-4 text-slate-500" />
                )}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>
                    {entry.actor?.name ?? entry.actor?.email ?? "System"}
                  </span>
                  <span>•</span>
                  <span>{entry.createdAt.toLocaleString()}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {entry.action}
                </p>
                {entry.note && (
                  <p className="text-sm text-slate-600">{entry.note}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <CommentThread applicationId={applicationId} comments={comments} />
      </div>
    </div>
  );
}

type SectionBuckets = {
  profile: SubmissionSection[];
  financials: SubmissionSection[];
  compliance: SubmissionSection[];
  banking: SubmissionSection[];
  contacts: SubmissionSection[];
};

function bucketSections(sections: SubmissionSection[]): SectionBuckets {
  const buckets: SectionBuckets = {
    profile: [],
    financials: [],
    compliance: [],
    banking: [],
    contacts: [],
  };

  sections.forEach((section) => {
    const target = determineBucket(section);
    buckets[target].push(section);
  });

  return buckets;
}

function determineBucket(section: SubmissionSection): keyof SectionBuckets {
  const text = `${section.key} ${section.label}`.toLowerCase();
  if (text.includes("bank")) {
    return "banking";
  }
  if (text.includes("finance") || text.includes("tax")) {
    return "financials";
  }
  if (
    text.includes("compliance") ||
    text.includes("document") ||
    text.includes("certificate")
  ) {
    return "compliance";
  }
  if (text.includes("contact")) {
    return "contacts";
  }
  return "profile";
}

function formatFieldValue(value: unknown, isSensitive: boolean) {
  if (isSensitive && value) {
    return "••••••";
  }
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

