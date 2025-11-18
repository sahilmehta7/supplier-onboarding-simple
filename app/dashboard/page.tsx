import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryMetric {
  id: string;
  label: string;
  value: string;
  trend: string;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const metrics: SummaryMetric[] = [
    {
      id: "applications",
      label: "Active Applications",
      value: String(18),
      trend: "+3 vs last week",
    },
    {
      id: "processing-time",
      label: "Median Processing Time",
      value: "6.2 days",
      trend: "-1.4 days vs target",
    },
    {
      id: "spend",
      label: "Approved Spend",
      value: currencyFormatter.format(480000),
      trend: "+12% vs plan",
    },
  ];

  const applicationUpdates = [
    {
      id: "1",
      supplier: "Northwind Logistics",
      stage: "Clarification Required",
      owner: "Kelly M.",
      updatedAt: "2h ago",
    },
    {
      id: "2",
      supplier: "Acme Components",
      stage: "Risk Review",
      owner: "Jordan P.",
      updatedAt: "5h ago",
    },
    {
      id: "3",
      supplier: "Evergreen Supplies",
      stage: "Approved",
      owner: "You",
      updatedAt: "1d ago",
    },
  ];

  const workflowTasks = [
    {
      id: "cta",
      title: "Review newly submitted profiles",
      description: "Validate completeness and assign risk reviewers.",
      action: "Assign reviewers",
    },
    {
      id: "policies",
      title: "Align policy pack for EU suppliers",
      description: "Update requirement set to include 2025 compliance docs.",
      action: "Update requirements",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.id} className="shadow-none">
              <CardHeader className="pb-3">
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {metric.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {metric.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className="shadow-none">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base font-semibold">
                  Critical Applications
                </CardTitle>
                <CardDescription>
                  Recently updated items requiring attention.
                </CardDescription>
              </div>
              <Badge variant="outline">3 awaiting action</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {applicationUpdates.map((application) => (
                <article
                  key={application.id}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 rounded-lg border border-border/60 px-4 py-3 text-sm transition hover:border-border hover:bg-muted/40"
                >
                  <div className="font-medium text-foreground">
                    {application.supplier}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {application.stage}
                  </span>
                  <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
                    <span>{application.owner}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{application.updatedAt}</span>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                Next Actions
              </CardTitle>
              <CardDescription>
                Suggested tasks to keep onboarding moving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflowTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-border/60 p-4 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    </div>
                    <Badge variant="outline">{task.action}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                Integration Health
              </CardTitle>
              <CardDescription>
                Summary of connected systems powering onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4 rounded-lg border border-border/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  ERP
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    SAP Integration
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Syncing supplier master data nightly at 02:00.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border border-border/60 p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Slack Alerts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Routing clarifications to #supplier-ops (healthy).
                  </p>
                </div>
        </div>
            </CardContent>
          </Card>
        </section>
    </div>
  );
}
