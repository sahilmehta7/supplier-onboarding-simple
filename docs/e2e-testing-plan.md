# E2E Testing Plan - Submission Workflow Phase 4

**Status:** 📋 Ready for Execution  
**Estimated Time:** 1-2 days  
**Created:** 2025-01-21  
**Based on:** Phase 4 Implementation

---

## Overview

This document outlines comprehensive End-to-End (E2E) testing scenarios for the Submission Workflow system, covering all Phase 4 features including optimistic locking, real-time status updates, enhanced error handling, and accessibility improvements.

---

## Prerequisites

### Test Environment Setup

- [ ] Test database seeded with sample data
- [ ] Test users created:
  - [ ] Supplier user (SUPPLIER role)
  - [ ] Procurement user (PROCUREMENT role)
  - [ ] Admin user (ADMIN role)
  - [ ] Internal team member (MEMBER role)
- [ ] Test organizations created
- [ ] Test form configurations created
- [ ] Browser testing tools ready (Playwright/Cypress recommended)
- [ ] API testing tools ready (Postman/Insomnia)

### Test Data Requirements

**Organizations:**
- Supplier Organization A (with SUPPLIER user)
- Supplier Organization B (with SUPPLIER user)
- Internal Organization (with PROCUREMENT, ADMIN, MEMBER users)

**Form Configurations:**
- FormConfig 1: Entity A + Geography US
- FormConfig 2: Entity B + Geography UK

**Applications:**
- Application in DRAFT status
- Application in SUBMITTED status
- Application in IN_REVIEW status
- Application in PENDING_SUPPLIER status
- Application in APPROVED status
- Application in REJECTED status

---

## Test Scenarios

### Scenario 1: Complete Supplier Submission Journey

**Objective:** Verify the complete workflow from draft creation to approval and Company Profile access.

**Test Steps:**

#### Step 1.1: Create New Application
1. Log in as Supplier user
2. Navigate to `/supplier/onboarding/new`
3. Select FormConfig (Entity A + Geography US)
4. Verify application created with status `DRAFT`
5. Verify version is `1`
6. Verify form fields are editable
7. Verify "Save draft" button is enabled
8. Verify "Submit" button is enabled
9. Verify no status polling indicator visible

**Expected Results:**
- ✅ Application created successfully
- ✅ Status is `DRAFT`
- ✅ Version is `1`
- ✅ All form fields editable
- ✅ Buttons enabled correctly
- ✅ No polling active

#### Step 1.2: Fill Form and Save Draft
1. Fill in supplier information:
   - Supplier name: "Test Supplier Inc"
   - Sales contact name: "John Doe"
   - Sales contact email: "john@testsupplier.com"
2. Fill in address:
   - Line 1: "123 Test Street"
   - City: "Test City"
   - Country: "USA"
3. Fill in banking information:
   - Bank name: "Test Bank"
   - Routing number: "123456789"
   - Account number: "987654321"
4. Click "Save draft"
5. Verify success message appears
6. Verify form data persists after page refresh
7. Verify version increments to `2`

**Expected Results:**
- ✅ Draft saved successfully
- ✅ Success toast notification appears
- ✅ Data persists after refresh
- ✅ Version increments correctly
- ✅ No errors in console

#### Step 1.3: Submit Application
1. Verify form is still editable
2. Click "Submit for Review"
3. Verify loading state on submit button
4. Verify success message appears
5. Verify status changes to `SUBMITTED`
6. Verify form fields become read-only
7. Verify "Save draft" button hidden
8. Verify "Submit" button hidden
9. Verify status message displayed: "Application submitted. Awaiting review."
10. Verify status polling indicator appears
11. Verify version increments to `3`
12. Verify `submissionType` is `SUPPLIER`
13. Verify `submittedById` is set to supplier user ID

**Expected Results:**
- ✅ Submission successful
- ✅ Status changes to `SUBMITTED`
- ✅ Form becomes read-only
- ✅ Buttons hidden correctly
- ✅ Status message displayed
- ✅ Polling starts
- ✅ Version increments
- ✅ Submission metadata set correctly

#### Step 1.4: Procurement Reviews
1. Log in as Procurement user
2. Navigate to `/dashboard/procurement`
3. Find the submitted application
4. Verify "Submitted By" shows "Supplier" badge
5. Click to view application details
6. Verify all form data displays correctly
7. Change status to `IN_REVIEW`
8. Verify status update in database
9. Return to supplier view (keep both tabs open)

**Expected Results:**
- ✅ Application visible in procurement dashboard
- ✅ Submission source badge shows "Supplier"
- ✅ Application details display correctly
- ✅ Status change successful

#### Step 1.5: Status Polling Detection
1. In supplier browser tab (still open from Step 1.3)
2. Wait for status polling (should poll every 5 seconds)
3. Verify status indicator shows "Checking for updates..."
4. After procurement changes status to `IN_REVIEW`, wait up to 10 seconds
5. Verify status updates automatically (without refresh)
6. Verify notification toast appears: "Status updated - Application status changed to IN_REVIEW"
7. Verify status message updates
8. Verify form remains read-only
9. Verify polling continues

**Expected Results:**
- ✅ Status polling works
- ✅ Status updates automatically
- ✅ Notification appears
- ✅ UI updates without refresh
- ✅ Polling continues

#### Step 1.6: Procurement Approves
1. In procurement browser tab
2. Change application status to `APPROVED`
3. Verify Supplier record created in database
4. Verify Supplier.data matches Application.data
5. Verify Supplier documents copied from Application
6. Return to supplier browser tab

**Expected Results:**
- ✅ Status change successful
- ✅ Supplier record created
- ✅ Data copied correctly

#### Step 1.7: Redirect to Company Profile
1. In supplier browser tab
2. Wait for status polling to detect `APPROVED` status (up to 10 seconds)
3. Verify automatic redirect to `/supplier/profile/[supplierId]`
4. Verify Company Profile displays:
   - All supplier information
   - All addresses
   - Banking information (masked if sensitive)
   - Documents with download links
   - Approval metadata
5. Verify status polling stops (no longer needed)
6. Verify can edit fields (triggers re-approval workflow)

**Expected Results:**
- ✅ Automatic redirect works
- ✅ Company Profile displays correctly
- ✅ All data visible
- ✅ Documents accessible
- ✅ Polling stops
- ✅ Editing works

**Test Duration:** ~30 minutes  
**Priority:** Critical

---

### Scenario 2: Procurement Requests Changes

**Objective:** Verify field-level editing control when procurement requests specific field changes.

**Test Steps:**

#### Step 2.1: Setup - Submit Application
1. Log in as Supplier user
2. Create and submit application (follow Steps 1.1-1.3 from Scenario 1)
3. Verify application is `SUBMITTED`
4. Log in as Procurement user

**Expected Results:**
- ✅ Application submitted successfully

#### Step 2.2: Procurement Adds Comment with Field Key
1. Navigate to application detail page
2. Add comment:
   - Body: "Please update the supplier name and sales contact email"
   - Visibility: "supplier_visible"
   - Field Key: "supplierInformation.supplierName"
3. Add second comment:
   - Body: "Also update the email address"
   - Visibility: "supplier_visible"
   - Field Key: "supplierInformation.salesContactEmail"
4. Set status to `PENDING_SUPPLIER`
5. Verify status change successful

**Expected Results:**
- ✅ Comments created with field keys
- ✅ Status changed to `PENDING_SUPPLIER`

#### Step 2.3: Supplier Views Pending Application
1. Log in as Supplier user
2. Navigate to application
3. Verify status is `PENDING_SUPPLIER`
4. Verify status message: "Procurement has requested changes to specific fields..."
5. Verify only specified fields are editable:
   - `supplierInformation.supplierName` - editable (highlighted/bordered)
   - `supplierInformation.salesContactEmail` - editable (highlighted/bordered)
6. Verify other fields are read-only:
   - `supplierInformation.salesContactName` - read-only with tooltip
   - `addresses.remitToAddress.line1` - read-only with tooltip
   - All other fields - read-only
7. Verify read-only fields show tooltip: "This field was not requested for changes"
8. Verify "Save draft" button enabled
9. Verify "Resubmit" button enabled

**Expected Results:**
- ✅ Status message displayed
- ✅ Only specified fields editable
- ✅ Visual indication on editable fields
- ✅ Read-only fields clearly marked
- ✅ Tooltips explain why fields are read-only

#### Step 2.4: Supplier Edits Only Allowed Fields
1. Edit `supplierInformation.supplierName` to "Updated Supplier Name"
2. Edit `supplierInformation.salesContactEmail` to "updated@testsupplier.com"
3. Verify changes save successfully
4. Verify version increments
5. Click "Save draft"
6. Verify draft saves successfully

**Expected Results:**
- ✅ Allowed fields editable
- ✅ Changes save successfully
- ✅ Version increments

#### Step 2.5: Attempt to Edit Non-Allowed Field (Should Fail)
1. Attempt to edit `supplierInformation.salesContactName`
2. Verify field is disabled/read-only
3. Verify cannot change value
4. If somehow changed, verify validation error on save

**Expected Results:**
- ✅ Non-allowed fields cannot be edited
- ✅ Validation prevents saving non-allowed changes

#### Step 2.6: Resubmit Application
1. Click "Resubmit for Review"
2. Verify loading state
3. Verify success message
4. Verify status changes to `SUBMITTED`
5. Verify form becomes fully read-only
6. Verify status message updates
7. Verify version increments
8. Verify audit log shows resubmission

**Expected Results:**
- ✅ Resubmission successful
- ✅ Status returns to `SUBMITTED`
- ✅ Form locked again
- ✅ Version increments
- ✅ Audit trail maintained

**Test Duration:** ~25 minutes  
**Priority:** Critical

---

### Scenario 3: Concurrent Edit Detection

**Objective:** Verify optimistic locking prevents data loss from concurrent edits.

**Test Steps:**

#### Step 3.1: Setup - Create Application
1. Log in as Supplier user
2. Create application (follow Step 1.1 from Scenario 1)
3. Fill form with initial data
4. Save draft
5. Note the current version (should be 2)
6. Keep browser tab open

**Expected Results:**
- ✅ Application created
- ✅ Version is 2

#### Step 3.2: Open Same Application in Second Browser
1. Open new browser window (or incognito)
2. Log in as same Supplier user (or different user in same organization)
3. Navigate to same application
4. Verify form loads with same data
5. Verify version is 2 (same as Step 3.1)

**Expected Results:**
- ✅ Application loads correctly
- ✅ Version matches (2)

#### Step 3.3: User A Saves Changes
1. In Browser Tab A (from Step 3.1)
2. Edit supplier name to "User A Update"
3. Click "Save draft"
4. Verify save successful
5. Verify version increments to 3
6. Verify success message appears

**Expected Results:**
- ✅ Save successful
- ✅ Version increments to 3

#### Step 3.4: User B Attempts to Save (Should Detect Conflict)
1. In Browser Tab B (from Step 3.2)
2. Edit supplier name to "User B Update"
3. Note: Form still shows version 2
4. Click "Save draft"
5. Verify error occurs
6. Verify error message: "Application has been modified by another user. Please refresh and try again."
7. Verify error has code: `OPTIMISTIC_LOCK_ERROR`
8. Verify "Refresh Page" button appears
9. Verify toast notification shows conflict message

**Expected Results:**
- ✅ Error detected correctly
- ✅ User-friendly error message
- ✅ Actionable error (refresh button)
- ✅ Toast notification appears

#### Step 3.5: User B Refreshes and Retries
1. Click "Refresh Page" button (or manually refresh)
2. Verify page reloads
3. Verify form shows User A's changes ("User A Update")
4. Verify version is now 3
5. Edit supplier name to "User B Final Update"
6. Click "Save draft"
7. Verify save successful
8. Verify version increments to 4

**Expected Results:**
- ✅ Refresh works
- ✅ Latest data loaded
- ✅ Version updated
- ✅ Save successful after refresh

#### Step 3.6: Verify No Data Loss
1. In Browser Tab A, refresh page
2. Verify form shows "User B Final Update"
3. Verify version is 4
4. Verify no data corruption
5. Verify all fields intact

**Expected Results:**
- ✅ No data loss
- ✅ Latest changes visible
- ✅ Data integrity maintained

**Test Duration:** ~20 minutes  
**Priority:** High

---

### Scenario 4: Real-Time Status Updates

**Objective:** Verify status polling detects changes automatically and updates UI.

**Test Steps:**

#### Step 4.1: Setup - Submit Application
1. Log in as Supplier user
2. Create and submit application (follow Steps 1.1-1.3 from Scenario 1)
3. Verify status is `SUBMITTED`
4. Verify status polling indicator appears
5. Verify polling is active

**Expected Results:**
- ✅ Application submitted
- ✅ Polling active

#### Step 4.2: Verify Polling Behavior
1. Open browser DevTools Network tab
2. Filter for `/api/applications/[id]/status`
3. Verify requests occur every ~5 seconds
4. Verify requests return 200 status
5. Verify response includes:
   - `status`: "SUBMITTED"
   - `version`: current version number
   - `updatedAt`: timestamp
6. Verify no errors in console

**Expected Results:**
- ✅ Polling requests every 5 seconds
- ✅ Requests successful
- ✅ Response format correct
- ✅ No errors

#### Step 4.3: Procurement Changes Status
1. Log in as Procurement user (separate browser/tab)
2. Navigate to application
3. Change status to `IN_REVIEW`
4. Verify status change in database

**Expected Results:**
- ✅ Status changed successfully

#### Step 4.4: Verify Automatic Status Update
1. Return to Supplier browser tab
2. Wait up to 10 seconds (2 polling cycles)
3. Verify status updates automatically (without refresh)
4. Verify status message updates
5. Verify notification toast appears: "Status updated - Application status changed to IN_REVIEW"
6. Verify status polling continues
7. Verify no page refresh occurred

**Expected Results:**
- ✅ Status updates automatically
- ✅ UI updates without refresh
- ✅ Notification appears
- ✅ Polling continues

#### Step 4.5: Multiple Status Changes
1. Procurement changes status to `PENDING_SUPPLIER`
2. Wait for supplier view to update (up to 10 seconds)
3. Verify status updates automatically
4. Verify notification appears
5. Verify form fields become selectively editable
6. Procurement changes status to `APPROVED`
7. Wait for supplier view to update
8. Verify redirect to Company Profile
9. Verify polling stops (no longer needed)

**Expected Results:**
- ✅ Multiple status changes detected
- ✅ UI updates correctly each time
- ✅ Redirect works on approval
- ✅ Polling stops appropriately

#### Step 4.6: Verify Polling Stops When Not Needed
1. Navigate to application in `DRAFT` status
2. Verify no polling indicator
3. Verify no polling requests in Network tab
4. Navigate to application in `REJECTED` status
5. Verify no polling indicator
6. Verify no polling requests

**Expected Results:**
- ✅ Polling only active for pollable statuses
- ✅ Polling stops when not needed

**Test Duration:** ~25 minutes  
**Priority:** High

---

### Scenario 5: Internal Team Submission

**Objective:** Verify internal team can create and submit applications on behalf of suppliers.

**Test Steps:**

#### Step 5.1: Admin Creates Application for Supplier
1. Log in as Admin user
2. Navigate to `/dashboard/procurement`
3. Click "Create Application" (if available) or use API
4. Select Supplier Organization A
5. Select FormConfig (Entity A + Geography US)
6. Verify application created with status `DRAFT`
7. Verify `createdById` is Admin user ID
8. Verify application appears in procurement dashboard

**Expected Results:**
- ✅ Application created successfully
- ✅ Created by Admin tracked
- ✅ Visible in dashboard

#### Step 5.2: Admin Fills and Submits Application
1. Navigate to application detail page
2. Fill in form data:
   - Supplier name: "Internal Created Supplier"
   - Sales contact: "Admin Contact"
   - Email: "admin@internal.com"
   - Address: "456 Admin Street"
3. Click "Submit on Behalf" (or equivalent)
4. Verify submission successful
5. Verify status changes to `SUBMITTED`
6. Verify `submissionType` is `INTERNAL`
7. Verify `submittedById` is Admin user ID
8. Verify audit log entry created with `submissionType: 'INTERNAL'`

**Expected Results:**
- ✅ Submission successful
- ✅ Status changed correctly
- ✅ Submission type tracked
- ✅ Audit log created

#### Step 5.3: Verify Submission Source in Dashboard
1. Navigate to `/dashboard/procurement`
2. Find the submitted application
3. Verify "Submitted By" column shows:
   - Badge: "Internal" (blue)
   - Icon: Building2 icon
   - Name: Admin user name
4. Verify visual distinction from supplier submissions
5. Click to view details

**Expected Results:**
- ✅ Submission source displayed correctly
- ✅ Visual distinction clear
- ✅ Badge and icon correct

#### Step 5.4: Supplier Views Application
1. Log in as Supplier user (from Supplier Organization A)
2. Navigate to `/supplier` dashboard
3. Verify application appears in list
4. Click to view application
5. Verify form is read-only (status is `SUBMITTED`)
6. Verify cannot edit
7. Verify status message displayed
8. Verify status polling active

**Expected Results:**
- ✅ Application visible to supplier
- ✅ Form read-only
- ✅ Status correct
- ✅ Polling active

#### Step 5.5: Procurement Reviews Internal Submission
1. Log in as Procurement user
2. Navigate to application
3. Verify submission metadata shows:
   - "Submitted by: Internal Team"
   - Admin user name/email
   - Submission type badge: "Internal"
4. Verify all form data displays correctly
5. Approve application
6. Verify Supplier record created

**Expected Results:**
- ✅ Submission metadata correct
- ✅ Data displays correctly
- ✅ Approval works
- ✅ Supplier created

#### Step 5.6: Supplier Accesses Company Profile
1. As Supplier user, verify redirect to Company Profile
2. Verify profile displays all data
3. Verify can edit fields
4. Verify re-approval workflow works

**Expected Results:**
- ✅ Profile accessible
- ✅ Data correct
- ✅ Editing works

#### Step 5.7: Verify Internal Team Cannot Access Profile
1. Log in as Admin user
2. Attempt to navigate to `/supplier/profile/[supplierId]`
3. Verify access denied or redirect
4. Verify can access via procurement detail view instead

**Expected Results:**
- ✅ Profile access restricted to suppliers
- ✅ Internal team uses procurement view

**Test Duration:** ~30 minutes  
**Priority:** High

---

## Test Execution Plan

### Day 1: Core Functionality (6-7 hours)

**Morning (3-4 hours):**
- [ ] Scenario 1: Complete Supplier Submission Journey
- [ ] Scenario 2: Procurement Requests Changes

**Afternoon (3-4 hours):**
- [ ] Scenario 3: Concurrent Edit Detection
- [ ] Scenario 4: Real-Time Status Updates

### Day 2: Integration & Edge Cases (4-5 hours)

**Morning (2-3 hours):**
- [ ] Scenario 5: Internal Team Submission
- [ ] Cross-scenario testing

**Afternoon (2-3 hours):**
- [ ] Error handling verification
- [ ] Accessibility testing
- [ ] Performance testing
- [ ] Bug fixes and retesting

---

## Test Tools & Setup

### Recommended Tools

**E2E Testing Framework:**
- **Playwright** (recommended) - Modern, fast, reliable
- **Cypress** (alternative) - Good developer experience

**API Testing:**
- **Postman** or **Insomnia** - For API endpoint testing
- **curl** - For quick API verification

**Browser Testing:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Test Environment

**Database:**
- Separate test database
- Seed script with test data
- Ability to reset between test runs

**Application:**
- Staging environment
- All Phase 4 features deployed
- Debug logging enabled

---

## Test Data Setup Script

Create a test data setup script to ensure consistent test environment:

```typescript
// scripts/setup-e2e-test-data.ts
// This script should:
// 1. Create test organizations
// 2. Create test users (Supplier, Procurement, Admin, Member)
// 3. Create test form configurations
// 4. Create test applications in various states
// 5. Set up relationships
```

---

## Success Criteria

All scenarios pass if:

- ✅ All test steps complete without errors
- ✅ Expected results match actual results
- ✅ No console errors
- ✅ No data corruption
- ✅ Performance acceptable (< 2s response times)
- ✅ Accessibility verified
- ✅ Error messages user-friendly

---

## Bug Reporting Template

When bugs are found, document using this template:

```markdown
**Bug ID:** [Auto-generated]
**Scenario:** [Scenario number and name]
**Step:** [Step number and description]
**Severity:** [Critical/High/Medium/Low]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Screenshots:** [Attach if applicable]
**Console Errors:** [Any errors in console]
**Browser/OS:** [Browser version and OS]
```

---

## Test Execution Checklist

Before starting:
- [ ] Test environment ready
- [ ] Test data seeded
- [ ] All test users created
- [ ] Browser tools ready
- [ ] API testing tools ready
- [ ] Screenshot tool ready
- [ ] Bug tracking system ready

During testing:
- [ ] Follow test steps exactly
- [ ] Document any deviations
- [ ] Take screenshots of issues
- [ ] Record console errors
- [ ] Note performance issues
- [ ] Verify accessibility

After testing:
- [ ] Document all bugs found
- [ ] Prioritize bugs
- [ ] Create bug reports
- [ ] Summarize test results
- [ ] Update test documentation

---

## Risk Assessment

**High Risk Areas:**
1. Optimistic locking - Complex logic, could cause data loss
2. Status polling - Performance impact, could cause issues
3. Concurrent edits - Race conditions possible

**Mitigation:**
- Test optimistic locking thoroughly
- Monitor polling performance
- Test concurrent scenarios multiple times
- Have rollback plan ready

---

## Post-Testing Actions

After E2E testing completes:

1. **Bug Triage:**
   - Review all bugs found
   - Prioritize by severity
   - Assign to developers

2. **Fix Verification:**
   - Retest fixed bugs
   - Verify no regressions
   - Run full test suite

3. **Documentation:**
   - Update test results
   - Document any issues found
   - Update user guides if needed

4. **Deployment Decision:**
   - If all critical bugs fixed → Proceed to staging
   - If critical bugs remain → Fix before deployment
   - Document decision and rationale

---

## Appendix: Quick Reference

### Status Flow
```
DRAFT → SUBMITTED → IN_REVIEW → PENDING_SUPPLIER → IN_REVIEW → APPROVED/REJECTED
```

### Pollable Statuses
- `SUBMITTED`
- `IN_REVIEW`
- `PENDING_SUPPLIER`

### Non-Pollable Statuses
- `DRAFT`
- `APPROVED`
- `REJECTED`

### Editable Statuses
- `DRAFT` - Full editing
- `PENDING_SUPPLIER` - Selective editing

### Read-Only Statuses
- `SUBMITTED`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`

---

**Next Steps:**
1. Review this plan
2. Set up test environment
3. Create test data
4. Execute test scenarios
5. Document results
6. Fix bugs
7. Retest
8. Proceed to staging deployment

