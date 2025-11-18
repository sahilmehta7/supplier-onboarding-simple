import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Supplier Portal
        </p>
        <h1 className="text-4xl font-semibold text-slate-900 md:text-5xl">
          Onboard suppliers with clarity and speed
        </h1>
        <p className="text-base text-slate-600 md:text-lg">
          Guided onboarding, document collection, and real-time status tracking
          for your vendor ecosystem. Built for internal teams and supplier
          partners.
        </p>
      </div>
      <div className="flex flex-col gap-3 text-sm text-slate-500 md:flex-row">
        <div>
          <span className="text-slate-900">Suppliers:</span> Start your onboarding
          journey, save drafts, and see status updates in one place.
        </div>
        <div>
          <span className="text-slate-900">Internal teams:</span> Gain a live view of
          submissions and automate handoffs to MDM/ERP.
        </div>
      </div>
      <Link
        href="/signin"
        className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-slate-800"
      >
        Sign in to Supplier Hub
      </Link>
      <p className="text-xs text-slate-400">
        Google SSO required. Additional authentication methods coming soon.
      </p>
    </main>
  );
}

