import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInCard } from "@/components/auth/signin-card";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Supplier Hub
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Access your onboarding workspace
          </h1>
        </div>
        <SignInCard />
      </div>
    </main>
  );
}

