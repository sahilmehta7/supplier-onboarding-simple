import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "acme-inc" },
    update: {},
    create: {
      name: "Acme Inc",
      slug: "acme-inc",
      logoUrl: null,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {
      name: "Acme Owner",
    },
    create: {
      email: "owner@example.com",
      name: "Acme Owner",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: {
      role: "owner",
    },
    create: {
      role: "owner",
      user: { connect: { id: user.id } },
      organization: { connect: { id: organization.id } },
    },
  });

  console.log("Seed data created: organization and owner user");
}

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

