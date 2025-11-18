import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SupplierDashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const applications = await prisma.application.findMany({
    where: {
      organization: {
        members: { some: { userId: session.user.id } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const grouped = applications.reduce<
    Record<string, typeof applications>
  >((acc, app) => {
    acc[app.status] = acc[app.status] ?? [];
    acc[app.status].push(app);
    return acc;
  }, {});

  const statusOrder = [
    "DRAFT",
    "SUBMITTED",
    "PENDING_SUPPLIER",
    "IN_REVIEW",
    "APPROVED",
    "REJECTED",
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Supplier Workspace
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Welcome back
        </h1>
        <p className="text-sm text-slate-500">
          Create a new onboarding submission or resume an existing draft.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/supplier/onboarding/new"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Start new onboarding
        </Link>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          View onboarding guide
        </button>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Applications by status
          </h2>
          <p className="text-sm text-slate-500">
            Track drafts, submissions, and approvals at a glance.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {statusOrder.map((status) => {
            const items = grouped[status] ?? [];
            return (
              <div
                key={status}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {status}
                    </p>
                    <p className="text-xs text-slate-500">
                      {items.length} application
                      {items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <ul className="mt-3 space-y-3">
                  {items.slice(0, 3).map((application) => (
                    <li key={application.id} className="text-sm">
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                        <div>
                          <p className="font-medium text-slate-900">
                            #{application.id.slice(0, 6).toUpperCase()}
                          </p>
                          <p className="text-xs text-slate-500">
                            Updated{" "}
                            {new Date(
                              application.updatedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Link
                          className="text-xs font-medium text-slate-900 underline"
                          href={`/supplier/onboarding/${application.id}`}
                        >
                          Open
                        </Link>
                      </div>
                    </li>
                  ))}
                  {items.length > 3 && (
                    <li className="text-xs text-slate-500">
                      +{items.length - 3} more
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

