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
      role: "ADMIN",
    },
    create: {
      role: "ADMIN",
      user: { connect: { id: user.id } },
      organization: { connect: { id: organization.id } },
    },
  });

  const entity = await prisma.entity.upsert({
    where: { code: "ZET" },
    update: { name: "Zetwerk" },
    create: {
      code: "ZET",
      name: "Zetwerk",
      description: "Default legal entity",
    },
  });

  const geography = await prisma.geography.upsert({
    where: { code: "US" },
    update: { name: "United States" },
    create: {
      code: "US",
      name: "United States",
    },
  });

  await prisma.entityGeography.upsert({
    where: {
      entityId_geographyId: {
        entityId: entity.id,
        geographyId: geography.id,
      },
    },
    update: {},
    create: {
      entityId: entity.id,
      geographyId: geography.id,
    },
  });

  let formConfig = await prisma.formConfig.findFirst({
    where: {
      entityId: entity.id,
      geographyId: geography.id,
      version: 1,
    },
  });

  if (!formConfig) {
    formConfig = await prisma.formConfig.create({
      data: {
        entityId: entity.id,
        geographyId: geography.id,
        version: 1,
        title: "US Supplier Onboarding v1",
        description: "Baseline form config for US suppliers",
      },
    });

    await prisma.formSection.create({
      data: {
        formConfigId: formConfig.id,
        key: "supplier_information",
        label: "Supplier Information",
        order: 1,
        fields: {
          create: [
            {
              key: "supplier_name",
              label: "Supplier Name",
              type: "text",
              required: true,
              order: 1,
            },
            {
              key: "payment_terms",
              label: "Payment Terms",
              type: "select",
              required: true,
              order: 2,
              options: { values: ["Net 30", "Net 45", "Net 60"] },
            },
          ],
        },
      },
    });

    await prisma.formSection.create({
      data: {
        formConfigId: formConfig.id,
        key: "bank_information",
        label: "Bank Information",
        order: 2,
        fields: {
          create: [
            {
              key: "bank_name",
              label: "Bank Name",
              type: "text",
              required: true,
              order: 1,
            },
            {
              key: "routing_number",
              label: "US Routing Number",
              type: "text",
              required: true,
              order: 2,
              validation: { regex: "^[0-9]{9}$", message: "Must be 9 digits" },
            },
          ],
        },
      },
    });

    const documentType = await prisma.documentType.upsert({
      where: { key: "w9" },
      update: {},
      create: {
        key: "w9",
        label: "W-9 Form",
        category: "tax",
        description: "Required for US suppliers",
      },
    });

    await prisma.formDocumentRequirement.create({
      data: {
        formConfigId: formConfig.id,
        documentTypeId: documentType.id,
        required: true,
        helpText: "Upload a signed W-9 PDF.",
      },
    });
  }

  console.log("Seed data created: organization, user, and base form configuration");
}

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

