import { test, expect } from './helpers/test-setup';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Scenario 2: Procurement Requests Changes', () => {
  test('Field-level editing control when procurement requests changes', async ({
    supplierPage,
    procurementPage,
    supplierOrgA,
    internalOrg,
    formConfig1,
    entities,
    supplierUser,
    procurementUser,
  }) => {
    // Step 2.1: Setup - Submit Application
    await supplierPage.goto('/supplier/onboarding/new');
    await expect(supplierPage).toHaveURL(/\/supplier\/onboarding\/[a-z0-9]+/);
    
    const applicationId = supplierPage.url().split('/').pop()!;
    
    // Fill and submit form
    await supplierPage.fill('input[name*="supplierName"]', 'Original Supplier Name');
    await supplierPage.fill('input[name*="salesContactEmail"]', 'original@test.com');
    await supplierPage.fill('input[name*="salesContactName"]', 'Original Contact');
    await supplierPage.fill('input[name*="remitToAddress.line1"]', '123 Original St');
    
    await supplierPage.getByRole('button', { name: /submit for review/i }).click();
    await supplierPage.waitForTimeout(2000);
    
    // Verify application is SUBMITTED
    const submittedApp = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    expect(submittedApp?.status).toBe('SUBMITTED');
    
    // Step 2.2: Procurement Adds Comment with Field Key
    await procurementPage.goto('/dashboard/procurement');
    
    // Find and click the application
    await procurementPage.getByText('Original Supplier Name').first().click();
    
    // Add comment with field key (this would require finding the comment UI)
    // For now, we'll create via API
    await prisma.applicationComment.create({
      data: {
        applicationId: applicationId,
        authorId: procurementUser.id,
        body: 'Please update the supplier name and sales contact email',
        visibility: 'supplier_visible',
        fieldKey: 'supplierInformation.supplierName',
      },
    });
    
    await prisma.applicationComment.create({
      data: {
        applicationId: applicationId,
        authorId: procurementUser.id,
        body: 'Also update the email address',
        visibility: 'supplier_visible',
        fieldKey: 'supplierInformation.salesContactEmail',
      },
    });
    
    // Set status to PENDING_SUPPLIER
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'PENDING_SUPPLIER', pendingSince: new Date() },
    });
    
    // Step 2.3: Supplier Views Pending Application
    await supplierPage.reload();
    
    // Wait for status polling to detect PENDING_SUPPLIER
    await expect(
      supplierPage.getByText(/pending supplier/i)
    ).toBeVisible({ timeout: 15000 });
    
    // Verify status message
    await expect(
      supplierPage.getByText(/procurement has requested changes/i)
    ).toBeVisible();
    
    // Verify only specified fields are editable
    const supplierNameInput = supplierPage.locator('input[name*="supplierName"]');
    const emailInput = supplierPage.locator('input[name*="salesContactEmail"]');
    const contactNameInput = supplierPage.locator('input[name*="salesContactName"]');
    
    await expect(supplierNameInput).toBeEnabled();
    await expect(emailInput).toBeEnabled();
    await expect(contactNameInput).toBeDisabled();
    
    // Step 2.4: Supplier Edits Only Allowed Fields
    await supplierNameInput.fill('Updated Supplier Name');
    await emailInput.fill('updated@testsupplier.com');
    
    // Wait for autosave
    await supplierPage.waitForTimeout(2000);
    
    // Verify changes save successfully
    await supplierPage.reload();
    await expect(supplierNameInput).toHaveValue('Updated Supplier Name');
    await expect(emailInput).toHaveValue('updated@testsupplier.com');
    
    // Step 2.5: Attempt to Edit Non-Allowed Field (Should Fail)
    // The field should be disabled, so we can't edit it
    await expect(contactNameInput).toBeDisabled();
    
    // Step 2.6: Resubmit Application
    const resubmitButton = supplierPage.getByRole('button', {
      name: /resubmit for review/i,
    });
    await expect(resubmitButton).toBeVisible();
    await resubmitButton.click();
    
    await supplierPage.waitForTimeout(2000);
    
    // Verify success message
    await expect(
      supplierPage.getByText(/application submitted/i)
    ).toBeVisible({ timeout: 5000 });
    
    // Verify status changes to SUBMITTED
    const resubmittedApp = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    expect(resubmittedApp?.status).toBe('SUBMITTED');
    
    // Verify form becomes fully read-only
    await supplierPage.reload();
    await expect(supplierNameInput).toBeDisabled();
    await expect(emailInput).toBeDisabled();
  });
});

