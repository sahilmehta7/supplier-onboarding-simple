import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SupplierLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-8 px-4 md:px-8">
        {children}
      </div>
    </div>
  );
}

