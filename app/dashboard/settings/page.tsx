import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { updateIntegrationsAction } from "../admin/actions";

export default async function SettingsPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Workspace
        </p>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure notifications and integrations for each organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>
            Additional preferences (notifications, SLAs, automation) will land here soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Looking for Freshdesk or email templates? Manage them below per organization.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Freshdesk integration</CardTitle>
          <CardDescription>
            Connect each organization to its Freshdesk workspace and customize outbound email templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
          {organizations.length === 0 ? (
            <p>No organizations available yet. Provision a workspace to enable integrations.</p>
          ) : (
            organizations.map((org) => (
              <div
                key={org.id}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-600"
              >
                <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                <form action={updateIntegrationsAction} className="space-y-2">
                  <input type="hidden" name="integration-org" value={org.id} />
                  <label className="text-xs font-semibold text-slate-500">
                    Freshdesk domain
                  </label>
                  <input
                    name="freshdesk-domain"
                    defaultValue={org.freshdeskDomain ?? ""}
                    placeholder="yourcompany.freshdesk.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                  <label className="text-xs font-semibold text-slate-500">
                    Freshdesk API key
                  </label>
                  <input
                    name="freshdesk-api-key"
                    defaultValue={org.freshdeskApiKey ?? ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    placeholder="****"
                  />
                  <label className="text-xs font-semibold text-slate-500">
                    Email template
                  </label>
                  <textarea
                    name="email-template"
                    defaultValue={org.emailTemplate ?? ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    rows={3}
                    placeholder="Notification email body..."
                  />
                  <button className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                    Save settings
                  </button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
