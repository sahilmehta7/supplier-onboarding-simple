import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInCard } from "@/components/auth/signin-card";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Supplier Hub
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Access your onboarding workspace
          </h1>
          <p className="text-sm text-neutral-500">
            Use your Google account to securely sign in. Need help?
            <Link href="/" className="text-neutral-900 underline underline-offset-2">
              Contact support
            </Link>
          </p>
        </div>
        <SignInCard />
      </div>
    </main>
  );
}

