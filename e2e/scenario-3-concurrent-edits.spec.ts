import { test, expect } from './helpers/test-setup';
import { Page, BrowserContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from './helpers/auth';

const prisma = new PrismaClient();

test.describe('Scenario 3: Concurrent Edit Detection', () => {
  test('Optimistic locking prevents data loss from concurrent edits', async ({
    supplierPage,
    supplierOrgA,
    supplierUser,
    formConfig1,
    entities,
  }) => {
    // Step 3.1: Setup - Create Application
    await supplierPage.goto('/supplier/onboarding/new');
    await expect(supplierPage).toHaveURL(/\/supplier\/onboarding\/[a-z0-9]+/);
    
    const applicationId = supplierPage.url().split('/').pop()!;
    
    // Fill form with initial data
    await supplierPage.fill('input[name*="supplierName"]', 'Initial Supplier Name');
    await supplierPage.waitForTimeout(2000); // Wait for autosave
    
    // Verify version is 2 after save
    const initialApp = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    expect(initialApp?.version).toBeGreaterThanOrEqual(2);
    const initialVersion = initialApp?.version || 2;
    
    // Step 3.2: Open Same Application in Second Browser
    // Create a new browser context for User B
    const contextB = await supplierPage.context().browser()?.newContext();
    if (!contextB) {
      throw new Error('Could not create new browser context');
    }
    
    const pageB = await contextB.newPage();
    await authenticateUser(
      pageB,
      supplierUser.email,
      supplierUser.name,
      supplierOrgA.id,
      'SUPPLIER'
    );
    
    await pageB.goto(`/supplier/onboarding/${applicationId}`);
    
    // Verify form loads with same data
    await expect(pageB.locator('input[name*="supplierName"]')).toHaveValue(
      'Initial Supplier Name'
    );
    
    // Step 3.3: User A Saves Changes
    await supplierPage.fill('input[name*="supplierName"]', 'User A Update');
    await supplierPage.waitForTimeout(2000); // Wait for autosave
    
    // Verify version increments
    const userAApp = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    expect(userAApp?.version).toBe(initialVersion + 1);
    
    // Step 3.4: User B Attempts to Save (Should Detect Conflict)
    await pageB.fill('input[name*="supplierName"]', 'User B Update');
    await pageB.waitForTimeout(2000); // Wait for autosave attempt
    
    // The form should show an error or the save should fail
    // Check for error message
    const errorMessage = pageB.getByText(/modified by another user/i);
    const conflictError = pageB.getByText(/conflict/i);
    
    // One of these should appear
    const hasError =
      (await errorMessage.isVisible().catch(() => false)) ||
      (await conflictError.isVisible().catch(() => false));
    
    // If error doesn't appear in UI, check via API call
    // The optimistic locking should prevent the save
    const userBApp = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    
    // Version should still be User A's version (not incremented by User B)
    expect(userBApp?.version).toBe(initialVersion + 1);
    
    // Step 3.5: User B Refreshes and Retries
    await pageB.reload();
    
    // Verify form shows User A's changes
    await expect(pageB.locator('input[name*="supplierName"]')).toHaveValue(
      'User A Update'
    );
    
    // Now User B can save successfully
    await pageB.fill('input[name*="supplierName"]', 'User B Final Update');
    await pageB.waitForTimeout(2000);
    
    // Verify save successful
    const finalApp = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    expect(finalApp?.version).toBe(initialVersion + 2);
    
    // Step 3.6: Verify No Data Loss
    await supplierPage.reload();
    await expect(supplierPage.locator('input[name*="supplierName"]')).toHaveValue(
      'User B Final Update'
    );
    
    // Cleanup
    await pageB.close();
    await contextB.close();
  });
});

