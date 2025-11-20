import { Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * Creates a test session in the database and sets the session cookie
 * This bypasses OAuth for E2E testing
 */
export async function createTestSession(
  userId: string,
  page: Page
): Promise<void> {
  // Create a session token
  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setDate(expires.getDate() + 7); // 7 days from now

  // Create session in database
  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  // Set the session cookie
  await page.context().addCookies([
    {
      name: 'next-auth.session-token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Creates a test user and returns the user ID
 */
export async function createTestUser(
  email: string,
  name: string
): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
    },
  });

  return user.id;
}

/**
 * Creates a test organization and returns the organization ID
 */
export async function createTestOrganization(
  name: string,
  slug: string
): Promise<string> {
  const org = await prisma.organization.upsert({
    where: { slug },
    update: { name },
    create: {
      name,
      slug,
    },
  });

  return org.id;
}

/**
 * Creates a membership for a user in an organization
 */
export async function createMembership(
  userId: string,
  organizationId: string,
  role: 'ADMIN' | 'MEMBER' | 'SUPPLIER' | 'PROCUREMENT' | 'MDM'
): Promise<void> {
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    update: { role },
    create: {
      userId,
      organizationId,
      role,
    },
  });
}

/**
 * Helper to authenticate a user in a Playwright page
 */
export async function authenticateUser(
  page: Page,
  email: string,
  name: string,
  organizationId: string,
  role: 'ADMIN' | 'MEMBER' | 'SUPPLIER' | 'PROCUREMENT' | 'MDM'
): Promise<void> {
  const userId = await createTestUser(email, name);
  await createMembership(userId, organizationId, role);
  await createTestSession(userId, page);
}

