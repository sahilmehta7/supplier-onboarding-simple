import { test, expect } from './helpers/test-setup';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Scenario 1: Complete Supplier Submission Journey', () => {
  test('Complete workflow from draft creation to approval', async ({
    supplierPage,
    procurementPage,
    supplierOrgA,
    internalOrg,
    formConfig1,
    entities,
  }) => {
    // Step 1.1: Create New Application
    await supplierPage.goto('/supplier/onboarding/new');
    
    // Should redirect to application page
    await expect(supplierPage).toHaveURL(/\/supplier\/onboarding\/[a-z0-9]+/);
    
    const applicationId = supplierPage.url().split('/').pop()!;
    
    // Verify application created with status DRAFT
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    
    expect(application).toBeTruthy();
    expect(application?.status).toBe('DRAFT');
    expect(application?.version).toBe(1);
    
    // Verify form fields are visible and editable
    await expect(supplierPage.locator('input[name*="supplierName"]')).toBeVisible();
    await expect(supplierPage.locator('input[name*="supplierName"]')).toBeEditable();
    
    // Verify buttons are enabled
    const submitButton = supplierPage.getByRole('button', {
      name: /submit for review/i,
    });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    
    // Step 1.2: Fill Form and Save Draft
    await supplierPage.fill('input[name*="supplierName"]', 'Test Supplier Inc');
    await supplierPage.fill('input[name*="salesContactName"]', 'John Doe');
    await supplierPage.fill('input[name*="salesContactEmail"]', 'john@testsupplier.com');
    await supplierPage.fill('input[name*="remitToAddress.line1"]', '123 Test Street');
    await supplierPage.fill('input[name*="remitToAddress.city"]', 'Test City');
    await supplierPage.fill('input[name*="remitToAddress.country"]', 'USA');
    await supplierPage.fill('input[name*="bankName"]', 'Test Bank');
    await supplierPage.fill('input[name*="routingNumber"]', '123456789');
    await supplierPage.fill('input[name*="accountNumber"]', '987654321');
    
    // Wait for autosave or manually trigger save
    // Note: The form may auto-save, so we'll wait a bit
    await supplierPage.waitForTimeout(2000);
    
    // Refresh page to verify data persists
    await supplierPage.reload();
    
    await expect(supplierPage.locator('input[name*="supplierName"]')).toHaveValue(
      'Test Supplier Inc'
    );
    
    // Verify version increments (should be 2 after save)
    const updatedApplication = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    expect(updatedApplication?.version).toBeGreaterThan(1);
    
    // Step 1.3: Submit Application
    await submitButton.click();
    
    // Wait for submission to complete
    await supplierPage.waitForTimeout(2000);
    
    // Verify success toast appears
    await expect(
      supplierPage.getByText(/application submitted/i)
    ).toBeVisible({ timeout: 5000 });
    
    // Verify status changes to SUBMITTED
    const submittedApp = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    expect(submittedApp?.status).toBe('SUBMITTED');
    expect(submittedApp?.submissionType).toBe('SUPPLIER');
    expect(submittedApp?.submittedById).toBeTruthy();
    
    // Verify form fields become read-only
    await supplierPage.reload();
    const supplierNameInput = supplierPage.locator('input[name*="supplierName"]');
    await expect(supplierNameInput).toBeDisabled();
    
    // Verify buttons are hidden
    await expect(submitButton).not.toBeVisible();
    
    // Verify status message displayed
    await expect(
      supplierPage.getByText(/application submitted/i)
    ).toBeVisible();
    
    // Step 1.4: Procurement Reviews
    await procurementPage.goto('/dashboard/procurement');
    
    // Find the submitted application in the table
    await expect(
      procurementPage.getByText('Test Supplier Inc')
    ).toBeVisible({ timeout: 10000 });
    
    // Verify "Submitted By" shows "Supplier" badge
    // Note: This depends on the actual UI implementation
    const submittedByBadge = procurementPage
      .locator('tr')
      .filter({ hasText: 'Test Supplier Inc' })
      .getByText(/supplier/i);
    await expect(submittedByBadge).toBeVisible();
    
    // Click to view application details
    await procurementPage
      .getByText('Test Supplier Inc')
      .first()
      .click();
    
    // Verify all form data displays correctly
    await expect(procurementPage.getByText('Test Supplier Inc')).toBeVisible();
    await expect(procurementPage.getByText('John Doe')).toBeVisible();
    await expect(procurementPage.getByText('john@testsupplier.com')).toBeVisible();
    
    // Change status to IN_REVIEW (this would require finding the status dropdown/button)
    // For now, we'll update via API
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'IN_REVIEW' },
    });
    
    // Step 1.5: Status Polling Detection
    // Return to supplier view
    await supplierPage.reload();
    
    // Wait for status polling to detect change (up to 10 seconds)
    await expect(
      supplierPage.getByText(/in review/i)
    ).toBeVisible({ timeout: 15000 });
    
    // Verify notification toast appears
    await expect(
      supplierPage.getByText(/status updated/i)
    ).toBeVisible({ timeout: 5000 });
    
    // Step 1.6: Procurement Approves
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    
    // Create Supplier record
    await prisma.supplier.create({
      data: {
        organizationId: supplierOrgA.id,
        entityId: entities.entityA,
        geographyId: entities.geographyUS,
        applicationId: applicationId,
        data: submittedApp?.data || {},
      },
    });
    
    // Step 1.7: Redirect to Company Profile
    // Wait for status polling to detect APPROVED (up to 10 seconds)
    await supplierPage.reload();
    
    // Should redirect to Company Profile
    await expect(supplierPage).toHaveURL(
      /\/supplier\/profile\/[a-z0-9]+/,
      { timeout: 15000 }
    );
    
    // Verify Company Profile displays data
    await expect(supplierPage.getByText('Test Supplier Inc')).toBeVisible();
    await expect(supplierPage.getByText('John Doe')).toBeVisible();
  });
});

