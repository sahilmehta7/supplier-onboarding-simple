import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function CreateOnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    redirect("/supplier");
  }

  const entity = await prisma.entity.upsert({
    where: { code: "ZET" },
    update: {},
    create: { code: "ZET", name: "Zetwerk" },
  });

  const geography = await prisma.geography.upsert({
    where: { code: "US" },
    update: {},
    create: { code: "US", name: "United States" },
  });

  const application = await prisma.application.create({
    data: {
      organizationId: membership.organizationId,
      entityId: entity.id,
      geographyId: geography.id,
      status: "DRAFT",
      createdById: session.user.id,
    },
  });

  redirect(`/supplier/onboarding/${application.id}`);
}

