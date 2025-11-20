import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cleans up test data from the database
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.auditLog.deleteMany({});
  await prisma.applicationComment.deleteMany({});
  await prisma.applicationDocument.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.supplierDocument.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.formDocumentRequirement.deleteMany({});
  await prisma.formField.deleteMany({});
  await prisma.formSection.deleteMany({});
  await prisma.formConfig.deleteMany({});
  await prisma.entityGeography.deleteMany({});
  await prisma.geography.deleteMany({});
  await prisma.entity.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
}

/**
 * Creates test entities and geographies
 */
export async function createTestEntities(): Promise<{
  entityA: string;
  entityB: string;
  geographyUS: string;
  geographyUK: string;
}> {
  const entityA = await prisma.entity.upsert({
    where: { code: 'ENTITY_A' },
    update: {},
    create: {
      code: 'ENTITY_A',
      name: 'Entity A',
      description: 'Test Entity A',
    },
  });

  const entityB = await prisma.entity.upsert({
    where: { code: 'ENTITY_B' },
    update: {},
    create: {
      code: 'ENTITY_B',
      name: 'Entity B',
      description: 'Test Entity B',
    },
  });

  const geographyUS = await prisma.geography.upsert({
    where: { code: 'US' },
    update: {},
    create: {
      code: 'US',
      name: 'United States',
    },
  });

  const geographyUK = await prisma.geography.upsert({
    where: { code: 'UK' },
    update: {},
    create: {
      code: 'UK',
      name: 'United Kingdom',
    },
  });

  // Create entity-geography relationships
  await prisma.entityGeography.upsert({
    where: {
      entityId_geographyId: {
        entityId: entityA.id,
        geographyId: geographyUS.id,
      },
    },
    update: {},
    create: {
      entityId: entityA.id,
      geographyId: geographyUS.id,
    },
  });

  await prisma.entityGeography.upsert({
    where: {
      entityId_geographyId: {
        entityId: entityB.id,
        geographyId: geographyUK.id,
      },
    },
    update: {},
    create: {
      entityId: entityB.id,
      geographyId: geographyUK.id,
    },
  });

  return {
    entityA: entityA.id,
    entityB: entityB.id,
    geographyUS: geographyUS.id,
    geographyUK: geographyUK.id,
  };
}

/**
 * Creates a form configuration with basic fields
 */
export async function createFormConfig(
  entityId: string,
  geographyId: string,
  version: number = 1
): Promise<string> {
  const formConfig = await prisma.formConfig.create({
    data: {
      entityId,
      geographyId,
      version,
      title: `Test Form Config v${version}`,
      description: 'Test form configuration',
      sections: {
        create: [
          {
            key: 'supplierInformation',
            label: 'Supplier Information',
            order: 1,
            fields: {
              create: [
                {
                  key: 'supplierName',
                  label: 'Supplier Name',
                  type: 'text',
                  required: true,
                  order: 1,
                },
                {
                  key: 'salesContactName',
                  label: 'Sales Contact Name',
                  type: 'text',
                  required: true,
                  order: 2,
                },
                {
                  key: 'salesContactEmail',
                  label: 'Sales Contact Email',
                  type: 'email',
                  required: true,
                  order: 3,
                },
              ],
            },
          },
          {
            key: 'addresses',
            label: 'Addresses',
            order: 2,
            fields: {
              create: [
                {
                  key: 'remitToAddress.line1',
                  label: 'Remit To Address Line 1',
                  type: 'text',
                  required: true,
                  order: 1,
                },
                {
                  key: 'remitToAddress.city',
                  label: 'City',
                  type: 'text',
                  required: true,
                  order: 2,
                },
                {
                  key: 'remitToAddress.country',
                  label: 'Country',
                  type: 'text',
                  required: true,
                  order: 3,
                },
              ],
            },
          },
          {
            key: 'bankingInformation',
            label: 'Banking Information',
            order: 3,
            fields: {
              create: [
                {
                  key: 'bankName',
                  label: 'Bank Name',
                  type: 'text',
                  required: true,
                  order: 1,
                },
                {
                  key: 'routingNumber',
                  label: 'Routing Number',
                  type: 'text',
                  required: true,
                  order: 2,
                },
                {
                  key: 'accountNumber',
                  label: 'Account Number',
                  type: 'text',
                  required: true,
                  order: 3,
                  isSensitive: true,
                },
              ],
            },
          },
        ],
      },
    },
  });

  return formConfig.id;
}

