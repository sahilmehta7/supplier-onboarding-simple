import { test as base } from '@playwright/test';
import { Page } from '@playwright/test';
import {
  authenticateUser,
  createTestUser,
  createTestOrganization,
  createMembership,
} from './auth';
import {
  cleanupTestData,
  createTestEntities,
  createFormConfig,
} from './database';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TestFixtures {
  // Test users
  supplierUser: { id: string; email: string; name: string };
  procurementUser: { id: string; email: string; name: string };
  adminUser: { id: string; email: string; name: string };
  memberUser: { id: string; email: string; name: string };

  // Test organizations
  supplierOrgA: { id: string; name: string; slug: string };
  supplierOrgB: { id: string; name: string; slug: string };
  internalOrg: { id: string; name: string; slug: string };

  // Test entities and geographies
  entities: {
    entityA: string;
    entityB: string;
    geographyUS: string;
    geographyUK: string;
  };

  // Form configurations
  formConfig1: string; // Entity A + Geography US
  formConfig2: string; // Entity B + Geography UK

  // Authenticated pages
  supplierPage: Page;
  procurementPage: Page;
  adminPage: Page;
}

export const test = base.extend<TestFixtures>({
  // Setup test data before all tests
  supplierUser: async ({}, use) => {
    const email = 'supplier@test.com';
    const name = 'Test Supplier';
    const userId = await createTestUser(email, name);
    await use({ id: userId, email, name });
  },

  procurementUser: async ({}, use) => {
    const email = 'procurement@test.com';
    const name = 'Test Procurement';
    const userId = await createTestUser(email, name);
    await use({ id: userId, email, name });
  },

  adminUser: async ({}, use) => {
    const email = 'admin@test.com';
    const name = 'Test Admin';
    const userId = await createTestUser(email, name);
    await use({ id: userId, email, name });
  },

  memberUser: async ({}, use) => {
    const email = 'member@test.com';
    const name = 'Test Member';
    const userId = await createTestUser(email, name);
    await use({ id: userId, email, name });
  },

  supplierOrgA: async ({ supplierUser }, use) => {
    const orgId = await createTestOrganization(
      'Supplier Organization A',
      'supplier-org-a'
    );
    await createMembership(supplierUser.id, orgId, 'SUPPLIER');
    await use({
      id: orgId,
      name: 'Supplier Organization A',
      slug: 'supplier-org-a',
    });
  },

  supplierOrgB: async ({ supplierUser }, use) => {
    const orgId = await createTestOrganization(
      'Supplier Organization B',
      'supplier-org-b'
    );
    await createMembership(supplierUser.id, orgId, 'SUPPLIER');
    await use({
      id: orgId,
      name: 'Supplier Organization B',
      slug: 'supplier-org-b',
    });
  },

  internalOrg: async ({ procurementUser, adminUser, memberUser }, use) => {
    const orgId = await createTestOrganization(
      'Internal Organization',
      'internal-org'
    );
    await createMembership(procurementUser.id, orgId, 'PROCUREMENT');
    await createMembership(adminUser.id, orgId, 'ADMIN');
    await createMembership(memberUser.id, orgId, 'MEMBER');
    await use({
      id: orgId,
      name: 'Internal Organization',
      slug: 'internal-org',
    });
  },

  entities: async ({}, use) => {
    const entities = await createTestEntities();
    await use(entities);
  },

  formConfig1: async ({ entities }, use) => {
    const formConfigId = await createFormConfig(
      entities.entityA,
      entities.geographyUS,
      1
    );
    await use(formConfigId);
  },

  formConfig2: async ({ entities }, use) => {
    const formConfigId = await createFormConfig(
      entities.entityB,
      entities.geographyUK,
      1
    );
    await use(formConfigId);
  },

  supplierPage: async ({ page, supplierUser, supplierOrgA }, use) => {
    await authenticateUser(
      page,
      supplierUser.email,
      supplierUser.name,
      supplierOrgA.id,
      'SUPPLIER'
    );
    await use(page);
  },

  procurementPage: async ({ page, procurementUser, internalOrg }, use) => {
    await authenticateUser(
      page,
      procurementUser.email,
      procurementUser.name,
      internalOrg.id,
      'PROCUREMENT'
    );
    await use(page);
  },

  adminPage: async ({ page, adminUser, internalOrg }, use) => {
    await authenticateUser(
      page,
      adminUser.email,
      adminUser.name,
      internalOrg.id,
      'ADMIN'
    );
    await use(page);
  },
});


