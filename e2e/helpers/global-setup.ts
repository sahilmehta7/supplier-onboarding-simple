import { cleanupTestData } from './database';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Global setup: Clean database before all tests
async function globalSetup() {
  await cleanupTestData();
}

// Global teardown: Clean database after all tests
async function globalTeardown() {
  await cleanupTestData();
  await prisma.$disconnect();
}

export default globalSetup;
export { globalTeardown };

