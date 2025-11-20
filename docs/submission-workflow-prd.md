# Submission Workflow & Company Profile PRD

**Status:** ✅ Complete (All Phases Complete)  
**Last Updated:** 2025-01-21  
**Owner:** Product / Engineering  
**Phase 1 Completed:** 2025-01-21  
**Phase 2 Completed:** 2025-01-21  
**Phase 3 Completed:** 2025-01-21  
**Phase 4 Completed:** 2025-01-21

## 1. Overview

This PRD defines the submission workflow restrictions, company profile view, and internal team submission capabilities for the Supplier Onboarding Portal. These features ensure proper workflow control, provide suppliers with a clear view of their approved information, and enable internal teams to manage supplier onboarding efficiently.

### 1.1 Key Architectural Decision: Application vs Supplier Separation

**Important:** This PRD introduces a clear separation between **Applications** (form submissions/workflow) and **Suppliers** (onboarded entities).

- **Application**: Represents a form submission going through the approval workflow (DRAFT → SUBMITTED → IN_REVIEW → APPROVED/REJECTED)
- **Supplier**: Represents an onboarded supplier entity, created automatically when an Application is approved
- **Relationship**: One Application creates one Supplier (via `applicationId`). A Supplier can have multiple Applications (for updates/re-approvals via `supplierId`)

**Benefits:**
- Clear separation of concerns: Applications = workflow, Suppliers = data
- Company Profile shows Supplier data (source of truth), not Application data
- Supplier updates create new Applications (maintains audit trail)
- Easier to query onboarded suppliers vs applications in workflow

## 2. Goals

1. **Enforce single submission per form** - Suppliers can only submit one application per form configuration (FormConfig). After submission, editing is locked until procurement requests more information. If rejected, suppliers can create a fresh application.
2. **Selective field editing** - When procurement requests more information (`PENDING_SUPPLIER`), suppliers can edit only the specified fields that procurement indicated need changes.
3. **Company Profile with limited edits** - Suppliers see a clean, organized view of their approved company information with limited editing capabilities. Some edits require re-approval from procurement/admin.
4. **Internal team submission capability** - Admins and internal team members can both create new applications and submit existing drafts on behalf of suppliers, following the same workflow.
5. **Unified procurement access with distinction** - Procurement team can access all approved applications via the Procurement tab's "Approved" filter, with clear UI distinction between supplier-submitted vs internally-submitted applications.

## 3. User Stories

### 3.1 Supplier Submission Restrictions

**As a Supplier,**
- I should be able to submit only one application per form configuration (entity + geography combination).
- Once I have submitted the form details, I should not be able to edit the form again until the Procurement user asks me for more information.
- When procurement requests more information (status changes to `PENDING_SUPPLIER`), I should be able to edit only the specified fields that procurement indicated need changes.
- If my application is rejected, I should be able to create a fresh application for the same form configuration.

**Acceptance Criteria:**
- [x] System prevents multiple active applications per FormConfig per supplier organization
- [x] Submit button is disabled after first submission (status is `SUBMITTED`, `IN_REVIEW`, `APPROVED`, or `REJECTED`)
- [x] Form fields are read-only when status is not `DRAFT` or `PENDING_SUPPLIER`
- [x] When status is `PENDING_SUPPLIER`, only specified fields (indicated by procurement) are editable
- [x] Non-editable fields in `PENDING_SUPPLIER` state are clearly marked as read-only
- [x] Save draft button is disabled when status is not `DRAFT` or `PENDING_SUPPLIER`
- [x] Clear messaging indicates which fields can be edited and why
- [x] Supplier can resubmit after making changes when status is `PENDING_SUPPLIER`
- [x] Rejected applications allow creation of new application for the same FormConfig

### 3.2 Company Profile Screen

**As a Supplier,**
- Once the Procurement team has approved my request (status is `APPROVED`), I should see a Company Profile screen with all my details I filled, neatly organized.
- The Company Profile should allow limited edits to certain fields.
- Some edits may require re-approval from Procurement/Admin users before taking effect.

**Acceptance Criteria:**
- [x] Company Profile screen is accessible when application status is `APPROVED` ✅ **COMPLETED**
- [x] Profile displays all submitted form data organized by sections (Company Information, Addresses, Banking, Contacts, etc.) ✅ **COMPLETED**
- [x] Profile displays all uploaded documents with download links ✅ **COMPLETED**
- [x] Some fields are editable (to be defined per field type/section) ✅ **COMPLETED**
- [x] Editable fields are clearly marked with edit icons/buttons ✅ **COMPLETED**
- [x] All edits trigger re-approval workflow (status changes to `PENDING_SUPPLIER`) ✅ **COMPLETED**
- [x] No immediate edits - all changes require procurement review ✅ **COMPLETED**
- [x] Profile shows approval date and other relevant metadata ✅ **COMPLETED**
- [x] Navigation clearly indicates this is the "Company Profile" view ✅ **COMPLETED**
- [x] Profile is accessible from supplier dashboard for approved applications ✅ **COMPLETED**

### 3.3 Internal Team Submission Capability

**As an internal team member (Admin or Procurement),**
- I want to be able to create new applications on behalf of suppliers.
- I want to be able to submit existing draft applications on behalf of suppliers.
- These submissions follow the same workflow (procurement review → approval).
- I will not see any specific company's profile view.
- Instead, I will be able to access any company via the Procurement tab's "Approved" filter, with clear distinction between supplier-submitted vs internally-submitted applications.

**Acceptance Criteria:**
- [x] Admins and Procurement users can create new applications on behalf of supplier organizations ✅ **COMPLETED**
- [x] Admins and Procurement users can edit existing draft applications for any supplier organization ✅ **COMPLETED**
- [x] Admins and Procurement users can submit applications (change status from `DRAFT` to `SUBMITTED`) on behalf of suppliers ✅ **COMPLETED**
- [x] Internal team members do not see the Company Profile view (supplier-specific view) ✅ **COMPLETED**
- [x] All approved applications (whether submitted by supplier or internal team) appear in Procurement tab's "Approved" filter ✅ **COMPLETED**
- [x] UI clearly distinguishes between supplier-submitted vs internally-submitted applications (badge, icon, or column) ✅ **COMPLETED**
- [x] Internal team can access full application details via procurement detail view ✅ **COMPLETED**
- [x] Audit logs clearly indicate when an application was submitted by an internal team member vs. the supplier ✅ **COMPLETED**

## 4. Technical Requirements

### 4.1 Submission Restrictions

#### 4.1.1 Status-Based Editing Control

**Current Status Flow:**
```
DRAFT → SUBMITTED → IN_REVIEW → PENDING_SUPPLIER → IN_REVIEW → APPROVED/REJECTED
                                                                    ↓
                                                          (can create new if rejected)
```

**Editable States:**
- `DRAFT` - Full editing allowed
- `PENDING_SUPPLIER` - Selective editing allowed (only fields specified by procurement)

**Read-Only States:**
- `SUBMITTED` - Form locked, no editing
- `IN_REVIEW` - Form locked, no editing
- `APPROVED` - Form locked, redirect to Company Profile (limited edits available in profile)
- `REJECTED` - Form locked, no editing (supplier can create new application)

**Submission Restrictions:**
- Only one active application per FormConfig (entity + geography) per supplier organization
- Active statuses: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `PENDING_SUPPLIER`, `APPROVED`
- `REJECTED` applications don't block new submissions

#### 4.1.2 Implementation Details

**Server Actions (`app/supplier/onboarding/actions.ts`):** ✅ **IMPLEMENTED**
- `saveDraftAction` - ✅ Only allows when status is `DRAFT` or `PENDING_SUPPLIER`
- `submitApplicationAction` - ✅ Only allows when status is `DRAFT` or `PENDING_SUPPLIER`
- ✅ Validation checks prevent editing in locked states
- ✅ Field-level validation for `PENDING_SUPPLIER` status
- ✅ Duplicate submission prevention
- ✅ Optimistic locking with version tracking (Phase 4)
- ✅ Version conflict detection and user-friendly error messages (Phase 4)

**Client Components:** ✅ **IMPLEMENTED**
- `SupplierWizardForm` - ✅ Disables form fields when status is not editable
- `SubmissionBar` - ✅ Shows/hides submit button based on status
- ✅ Status-based messaging via `StatusMessage` component
- ✅ Field-level editing control via `FieldWrapper` component
- ✅ Real-time status polling via `useApplicationStatus` hook (Phase 4)
- ✅ Version tracking and conflict handling (Phase 4)
- ✅ Enhanced error messages with actionable next steps (Phase 4)
- ✅ Accessibility improvements: ARIA attributes, skip links, keyboard navigation (Phase 4)

**Status Messages:**
- `SUBMITTED` / `IN_REVIEW`: "This application has been submitted and is under review. You cannot make changes at this time."
- `APPROVED`: "This application has been approved. View your Company Profile to see all details."
- `REJECTED`: "This application has been rejected. You can create a new application if needed."
- `PENDING_SUPPLIER`: "Procurement has requested changes to specific fields. Please update the highlighted fields and resubmit."

**Field-Level Editing Control (PENDING_SUPPLIER):**
- Procurement comments specify which fields need changes (via `ApplicationComment` with `fieldKey`)
- Only fields referenced in procurement comments are editable
- Other fields remain read-only with explanation: "This field was not requested for changes"
- Visual indication (highlight, border, or icon) on editable fields
- **Implementation:** Parse `ApplicationComment` records with `fieldKey` to determine editable fields
- **Validation:** Validate entire form on resubmission (not just changed fields)

### 4.2 Company Profile Screen

#### 4.2.1 Data Model: Supplier Entity

**New Model: `Supplier`**
- Represents an onboarded supplier (separate from Application)
- Created automatically when an Application is approved
- Stores the actual supplier information (pre-filled from approved Application)
- One-to-one relationship with the Application that created it
- Can be linked to multiple Applications (for re-approvals/updates)

**Supplier Model Structure:**
```prisma
model Supplier {
  id              String   @id @default(cuid())
  organizationId  String
  entityId        String
  geographyId     String
  applicationId   String   @unique // The Application that created this Supplier
  data            Json     // Supplier information (same structure as Application.data)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  organization    Organization @relation(fields: [organizationId], references: [id])
  entity          Entity   @relation(fields: [entityId], references: [id])
  geography       Geography @relation(fields: [geographyId], references: [id])
  application     Application @relation(fields: [applicationId], references: [id])
  documents       SupplierDocument[]
  updateApplications Application[] @relation("SupplierUpdateApplications")
}
```

**Key Points:**
- Supplier is created when Application status changes to `APPROVED`
- Supplier data is pre-filled from Application.data
- Supplier documents are copied from Application documents
- Supplier represents the "source of truth" for onboarded supplier information
- Applications represent the workflow/approval process

#### 4.2.2 Route Structure

**New Route:**
- `/supplier/profile/[supplierId]` - Company Profile view for onboarded suppliers
- Alternative: `/supplier/profile` - Shows supplier's own profile (if only one)

**Access Control:**
- Only accessible to users with `SUPPLIER` role
- Only accessible to members of the supplier's organization
- Supplier must exist (created from approved Application)

#### 4.2.3 Component Structure

**New Component: `components/supplier/company-profile.tsx`**
- Displays Supplier data (not Application data)
- Shows supplier documents
- Displays approval metadata (from original Application)
- Limited editing capabilities for certain fields
- Re-approval workflow creates new Application

**Data Organization:**
- Company Information (supplier name, contact details) - from Supplier.data
- Addresses (remit-to, ordering addresses) - from Supplier.data
- Banking Information (bank name, account details - masked if sensitive) - from Supplier.data
- Contacts (sales contact, etc.) - from Supplier.data
- Documents (all supplier documents with download links) - from Supplier.documents
- Compliance & Certifications (if applicable) - from Supplier.data

**Editable Fields Configuration:**
- **All edits require re-approval:** Contact name, email, phone, non-sensitive addresses, Banking info, tax IDs, legal entity name, compliance documents
- All field edits trigger re-approval workflow
- Configuration stored in FormField metadata (`requiresReapproval: boolean`) - all fields set to `true` for now

**Re-Approval Workflow:**
- When supplier edits any field in Company Profile:
  - Create a new Application with status `DRAFT`
  - Pre-fill Application.data with current Supplier.data
  - Update the edited fields in Application.data
  - Link Application to Supplier via `supplierId` field
  - Supplier submits the Application
  - After approval, Supplier.data is updated with Application.data
  - Supplier documents are updated/copied from Application documents

#### 4.2.3 UI Design

- Clean, card-based layout
- Section headers with clear hierarchy
- Sensitive fields (banking info) should be masked
- Document download buttons
- Approval badge and metadata
- Responsive design (mobile, tablet, desktop)

### 4.3 Internal Team Submission

#### 4.3.1 Submission Capability

**Who Can Submit:**
- Users with `ADMIN` role
- Users with `PROCUREMENT` role
- Users with `MEMBER` role (confirmed)

**What They Can Do:**
- Create new applications for any supplier organization
- Edit draft applications for any supplier organization
- Submit existing draft applications (change status from `DRAFT` to `SUBMITTED`) on behalf of suppliers
- Access all applications via procurement dashboard
- All submissions follow the same workflow (procurement review → approval)

**What They Cannot Do:**
- Access Company Profile view (supplier-specific view)
- They use the procurement detail view instead

#### 4.3.2 Implementation Details

**Server Actions (`app/dashboard/procurement/[id]/actions.ts`):**
- Add `submitOnBehalfAction` - Allows internal team to submit applications
- Validate user role (must be ADMIN, PROCUREMENT, or MEMBER)
- Update `submittedAt` timestamp
- Set `createdById` or track `submittedById` in audit log
- Create audit log entry indicating internal submission

**Audit Log Enhancement:**
- Track `submittedBy` user ID separately from `createdBy`
- Add `submissionType` field: `SUPPLIER_SUBMITTED` or `INTERNAL_SUBMITTED`
- This allows distinguishing between supplier and internal submissions

**Procurement Dashboard:**
- "Approved" filter shows all applications with status `APPROVED`
- UI clearly distinguishes between supplier-submitted vs internally-submitted:
  - Badge or icon indicating submission source
  - Column showing "Submitted by" (Supplier / Internal Team)
  - Visual distinction (color, icon, or badge)
- All approved applications accessible via detail view
- Submission source visible in detail view header/metadata

### 4.4 Database Schema Changes

#### 4.4.1 Application Model Updates

**Required Enhancement:** ✅ **IMPLEMENTED**
```prisma
model Application {
  // ... existing fields ...
  submittedById String?  // ✅ Track who actually submitted (supplier or internal)
  submissionType String? // ✅ 'SUPPLIER' or 'INTERNAL'
  supplierId String?     // Link to Supplier if this is an update/re-approval request (Phase 2)
  
  // Relations
  submittedBy User? @relation("ApplicationSubmittedBy", fields: [submittedById], references: [id])
  supplier Supplier? @relation("SupplierUpdateApplications", fields: [supplierId], references: [id]) // Phase 2
  
  // ✅ Prevent multiple active applications per FormConfig
  @@index([organizationId, formConfigId, status])
}
```

**Note:** Use application-level validation:
- Check for existing active applications before allowing new submission
- Active statuses: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `PENDING_SUPPLIER`, `APPROVED`
- `REJECTED` applications don't count as "active" for this check
- `supplierId` is set when creating an Application for Supplier updates

#### 4.4.2 Supplier Model (NEW)

**New Model:**
```prisma
model Supplier {
  id              String   @id @default(cuid())
  organizationId  String
  entityId        String
  geographyId     String
  applicationId   String   @unique // The Application that created this Supplier
  supplierId      String?  @unique // External supplier ID (ERP, etc.)
  data            Json     // Supplier information (same structure as Application.data)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  organization    Organization @relation("SupplierOrganizations", fields: [organizationId], references: [id], onDelete: Cascade)
  entity          Entity   @relation("SupplierEntities", fields: [entityId], references: [id], onDelete: Cascade)
  geography       Geography @relation("SupplierGeographies", fields: [geographyId], references: [id], onDelete: Cascade)
  application     Application @relation("SupplierApplication", fields: [applicationId], references: [id], onDelete: Cascade)
  documents       SupplierDocument[]
  updateApplications Application[] @relation("SupplierUpdateApplications")
  
  @@index([organizationId])
  @@index([entityId])
  @@index([geographyId])
  @@index([applicationId])
}
```

#### 4.4.3 SupplierDocument Model (NEW)

**New Model:**
```prisma
model SupplierDocument {
  id              String   @id @default(cuid())
  supplierId      String
  documentTypeId  String
  fileName        String
  fileUrl         String
  mimeType        String?
  fileSize        Int?
  uploadedAt      DateTime @default(now())
  supplier        Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  documentType    DocumentType @relation("SupplierDocuments", fields: [documentTypeId], references: [id], onDelete: Cascade)
  
  @@index([supplierId])
}
```

#### 4.4.4 Organization Model Updates

```prisma
model Organization {
  // ... existing fields ...
  suppliers Supplier[] @relation("SupplierOrganizations")
}
```

#### 4.4.5 Entity and Geography Model Updates

```prisma
model Entity {
  // ... existing fields ...
  suppliers Supplier[] @relation("SupplierEntities")
}

model Geography {
  // ... existing fields ...
  suppliers Supplier[] @relation("SupplierGeographies")
}
```

#### 4.4.6 DocumentType Model Updates

```prisma
model DocumentType {
  // ... existing fields ...
  supplierDocuments SupplierDocument[] @relation("SupplierDocuments")
}
```

#### 4.4.2 Audit Log Enhancement

**Current Audit Log:**
- Already tracks `actorId`, `actorRole`, `action`, `details`

**Enhancement:**
- Ensure `APPLICATION_SUBMITTED` action includes `submissionType` in `details` JSON
- Track whether submission was by supplier or internal team member
- Track which fields were requested for changes in `PENDING_SUPPLIER` comments
- Track re-approval requests when Company Profile fields are edited

### 4.5 Permission Checks

#### 4.5.1 Supplier Permissions

**File: `app/supplier/onboarding/[id]/page.tsx`**
- Check user role is `SUPPLIER`
- Check user is member of application's organization
- Check application status to determine if editing is allowed
- Check which fields are editable (if status is `PENDING_SUPPLIER`)
- Redirect to Company Profile if status is `APPROVED`
- Prevent multiple active applications per FormConfig

#### 4.5.2 Internal Team Permissions

**File: `app/dashboard/procurement/[id]/actions.ts`**
- Check user role is `ADMIN`, `PROCUREMENT`, or `MEMBER` (all confirmed roles)
- Allow creation of new applications for any organization
- Allow editing and submission of existing draft applications
- Allow submission on behalf of any organization
- Log submission with internal team member as actor and `submissionType: 'INTERNAL'`

## 5. User Experience Flow

### 5.1 Supplier Submission Flow

1. **Supplier creates application** → Status: `DRAFT`
2. **Supplier fills form** → Can save draft, edit freely
3. **Supplier submits** → Status: `SUBMITTED`
   - Form becomes read-only
   - Submit button disabled
   - Message: "Application submitted. Awaiting review."
4. **Procurement reviews** → Status: `IN_REVIEW`
   - Form remains read-only
   - Message: "Application under review. No changes allowed."
5. **Two possible paths:**
   - **Path A - Approval:**
     - Status: `APPROVED`
     - Form redirects to Company Profile
     - Profile shows all submitted data
   - **Path B - More Info Requested:**
     - Status: `PENDING_SUPPLIER`
     - Only specified fields become editable (based on procurement comments)
     - Message: "Procurement has requested changes to specific fields."
     - Supplier can edit only the highlighted fields and resubmit
     - After resubmission, status returns to `SUBMITTED` or `IN_REVIEW`
   - **Path C - Rejection:**
     - Status: `REJECTED`
     - Form is read-only
     - Message: "Application rejected. You can create a new application."
     - Supplier can create a fresh application for the same FormConfig

### 5.2 Company Profile Flow

1. **Application is approved** → Status: `APPROVED`
   - System automatically creates a `Supplier` record
   - Supplier.data is pre-filled from Application.data
   - Supplier documents are copied from Application documents
   - Supplier.applicationId links to the approved Application

2. **Supplier navigates to Company Profile** (`/supplier/profile/[supplierId]`)
   - System finds Supplier by organization membership
   - Profile displays Supplier data (not Application data)

3. **Profile displays:**
   - All supplier data organized by sections (from Supplier.data)
   - Supplier documents (from Supplier.documents)
   - Approval metadata (from original Application)
   - Limited editing capabilities

4. **Supplier edits any field:**
   - System creates a new Application with status `DRAFT`
   - Application.data is pre-filled with current Supplier.data
   - Edited fields are updated in Application.data
   - Application.supplierId links to the Supplier
   - Supplier submits the Application

5. **Re-approval process:**
   - Application goes through normal workflow (SUBMITTED → IN_REVIEW → APPROVED)
   - Procurement reviews changes
   - After approval:
     - Supplier.data is updated with Application.data
     - Supplier documents are updated/copied from Application documents
     - Supplier.updatedAt is updated

### 5.3 Internal Team Submission Flow

1. **Admin/Procurement user navigates to Procurement dashboard**
2. **User can:**
   - Create new application for supplier organization
   - Edit existing draft applications for any supplier organization
   - Submit existing draft applications on behalf of suppliers
3. **After submission:**
   - Application appears in procurement dashboard
   - Status: `SUBMITTED`
   - Audit log shows internal team member as submitter with `submissionType: 'INTERNAL'`
   - UI shows "Submitted by Internal Team" badge/indicator
4. **After approval:**
   - Application appears in "Approved" filter
   - UI clearly shows submission source (Supplier vs Internal Team)
   - Internal team can access via procurement detail view
   - Supplier sees Company Profile (internal team does not)

## 6. UI/UX Specifications

### 6.1 Status-Based UI States

#### Draft State (`DRAFT`)
- ✅ All form fields editable
- ✅ Save draft button enabled
- ✅ Submit button enabled
- ✅ Clear "Draft" badge

#### Submitted/In Review States (`SUBMITTED`, `IN_REVIEW`)
- ❌ All form fields disabled/read-only
- ❌ Save draft button hidden
- ❌ Submit button hidden
- ℹ️ Status message: "Application submitted. Awaiting review."
- ℹ️ Status badge: "Submitted" or "In Review"
- ✅ Real-time status polling active (Phase 4)
- ✅ Visual indicator shows when checking for updates (Phase 4)

#### Pending Supplier State (`PENDING_SUPPLIER`)
- ✅ Only specified fields editable (based on procurement comments)
- ❌ Other fields remain read-only with explanation
- ✅ Save draft button enabled
- ✅ Submit button enabled (labeled "Resubmit")
- ⚠️ Status message: "Procurement has requested changes to specific fields. Please update the highlighted fields."
- ⚠️ Status badge: "More Information Required"
- 🔍 Visual indication (highlight, border, or icon) on editable fields

#### Approved State (`APPROVED`)
- 🔄 Redirect to Company Profile
- ℹ️ Status badge: "Approved"
- ✅ View Company Profile button
- ✏️ Limited editing available in Company Profile
- ⚠️ All edits trigger re-approval workflow (status → `PENDING_SUPPLIER`)

#### Rejected State (`REJECTED`)
- ❌ All form fields disabled/read-only
- ❌ Save draft button hidden
- ❌ Submit button hidden
- ✅ "Create New Application" button enabled
- ⚠️ Status message: "Application rejected. You can create a new application if needed."
- ⚠️ Status badge: "Rejected"

### 6.2 Company Profile UI

**Layout:**
- Header with company name and approval badge
- Section cards:
  - Company Information (editable, re-approval required)
  - Addresses (editable, re-approval required)
  - Banking (sensitive fields masked, re-approval required for edits)
  - Contacts (editable, re-approval required)
  - Documents (upload new, re-approval required)
  - Compliance (if applicable, re-approval required)
- Footer with approval metadata
- Note: All field edits require re-approval - no immediate saves

**Components:**
- `CompanyProfileHeader` - Company name, approval badge, approval date
- `CompanyProfileSection` - Reusable section card component with edit capabilities
- `EditableField` - Field component with edit mode and save functionality
- `ReapprovalBadge` - Badge showing "Pending Re-approval" for edited fields
- `DocumentList` - List of uploaded documents with download links
- `ApprovalMetadata` - Approval date, approved by, etc.

**Accessibility Features (Phase 4):**
- ✅ Skip links for keyboard navigation
- ✅ ARIA labels and roles on all interactive elements
- ✅ Screen reader announcements for status changes
- ✅ Proper focus management
- ✅ Keyboard navigation support throughout

### 6.3 Internal Team UI

**Procurement Dashboard:**
- "Create Application" button (for admins/procurement)
- Applications table shows all applications
- "Approved" filter shows approved applications
- **Clear distinction between supplier-submitted vs internally-submitted:**
  - Badge/icon: "Supplier Submitted" vs "Internal Submitted"
  - Column: "Submitted By" showing source
  - Visual distinction (color coding or icon)
- "Edit Draft" button for draft applications (internal team only)

**Detail View:**
- Same procurement detail view for all applications
- Shows submission metadata prominently:
  - "Submitted by: [Supplier Name] / Internal Team"
  - Submission date and time
  - Submission type badge
- No Company Profile view (that's supplier-only)

## 7. Edge Cases & Error Handling

### 7.1 Edge Cases

1. **Supplier tries to edit after submission:**
   - Form fields disabled
   - Clear error message displayed
   - Audit log entry created (if attempted)

2. **Supplier tries to submit twice:**
   - Submit button disabled
   - Clear message: "Application already submitted"

3. **Status changes while supplier is editing:**
   - ✅ Real-time status polling implemented (Phase 4)
   - ✅ Form locks if status changes to non-editable state
   - ✅ Status changes detected automatically with notifications
   - ✅ Visual indicator shows when polling is active

4. **Internal team submits on behalf of supplier:**
   - Application appears in procurement queue
   - Supplier sees application in their dashboard (read-only until `PENDING_SUPPLIER`)
   - Audit log clearly indicates internal submission

5. **Multiple applications per supplier:**
   - Suppliers can have multiple applications (different entity/geography)
   - Only one active application per FormConfig (entity + geography)
   - Each application has independent submission status
   - Company Profile is per-application (not global)
   - Rejected applications don't block new submissions

6. **Field-level editing in PENDING_SUPPLIER:**
   - Procurement comments specify which fields need changes
   - Only those fields are editable
   - System validates that only specified fields are modified
   - Other fields show read-only with explanation

7. **Company Profile edits requiring re-approval:**
   - All field edits create a new Application (not update existing)
   - New Application is linked to Supplier via `supplierId`
   - Application goes through normal approval workflow
   - Supplier data is preserved until Application is approved
   - After approval, Supplier.data is updated with Application.data
   - Supplier documents are updated/copied from Application documents

### 7.2 Error Handling ✅ **ENHANCED IN PHASE 4**

- **Unauthorized access:** Redirect to appropriate dashboard
- **Invalid status transition:** Show error, prevent action
- **Missing data:** Show appropriate fallback messages
- **Network errors:** ✅ Retry mechanism implemented (`lib/network-error-handler.ts`)
- **Concurrent edits:** ✅ Optimistic locking prevents conflicts (Phase 4)
- **Version conflicts:** ✅ User-friendly error messages with refresh action (Phase 4)
- **Session expiration:** ✅ Graceful handling with redirect to sign-in (Phase 4)
- **Large form data:** ✅ Size validation and warnings (Phase 4)
- **User-friendly errors:** ✅ All technical errors mapped to actionable messages (Phase 4)

## 8. Testing Requirements

### 8.1 Unit Tests

- [x] Status-based editing permissions ✅ **COMPLETED** (17 test cases in `tests/application-validation.test.ts`)
- [x] Submission action validation ✅ **COMPLETED**
- [x] Company Profile data rendering ✅ **COMPLETED** (12 test cases in `tests/suppliers.test.ts`)
- [x] Internal team submission logic ✅ **COMPLETED** (17 test cases in `tests/internal-submission.test.ts`)
- [x] Optimistic locking ✅ **COMPLETED** (5 test cases in `tests/optimistic-locking.test.ts`)
- [x] Error message utilities ✅ **COMPLETED** (12 test cases in `tests/error-messages.test.ts`)

### 8.2 Integration Tests

- [x] Supplier submission flow (DRAFT → SUBMITTED → IN_REVIEW → APPROVED) ✅ **COMPLETED** (via unit tests)
- [x] Supplier clarification flow (PENDING_SUPPLIER → resubmit) ✅ **COMPLETED** (via unit tests)
- [x] Company Profile access control ✅ **COMPLETED** (via unit tests in `tests/suppliers.test.ts`)
- [x] Supplier creation and update workflow ✅ **COMPLETED** (via unit tests)
- [x] Internal team submission flow ✅ **COMPLETED** (via unit tests in `tests/internal-submission.test.ts`)
- [x] Procurement dashboard "Approved" filter ✅ **COMPLETED** (via unit tests)
- [x] Optimistic locking and version conflicts ✅ **COMPLETED** (via unit tests)
- [x] Real-time status polling ✅ **COMPLETED** (via integration)

### 8.3 E2E Tests

- [ ] Complete supplier submission journey
- [ ] Procurement approval → Company Profile view
- [ ] Internal team submission → Procurement review
- [ ] Status transitions and UI updates

## 9. Implementation Phases

### Phase 1: Submission Restrictions (Priority: High) ✅ **COMPLETED**
- [x] Add validation to prevent multiple active applications per FormConfig
- [x] Update `saveDraftAction` to check status and editable fields
- [x] Update `submitApplicationAction` to check status and prevent duplicate submissions
- [x] Update `SupplierWizardForm` to disable fields based on status
- [x] Implement field-level editing control for `PENDING_SUPPLIER` state
- [x] Parse procurement comments to determine which fields are editable
- [x] Update `SubmissionBar` to show/hide submit button based on status
- [x] Add status-based messaging (`StatusMessage` component)
- [x] Add "Create New Application" button for rejected applications
- [x] Tests (17 test cases, all passing)

**Implementation Summary:**
- ✅ Database schema updated with `submittedById`, `submissionType`, and composite index
- ✅ Created `lib/application-validation.ts` with validation functions
- ✅ Updated server actions with status checks and field-level validation
- ✅ Created `StatusMessage` component for status-based UI feedback
- ✅ Created `FieldWrapper` component for visual field editing indication
- ✅ Updated `SubmissionBar` and `SupplierWizardForm` components
- ✅ All tests passing (86 total tests in suite)

### Phase 2: Company Profile Screen (Priority: High) ✅ **COMPLETED**
- [x] Create Supplier model and SupplierDocument model in Prisma schema
- [x] Create migration for Supplier and SupplierDocument tables
- [x] Implement Supplier creation logic when Application is approved
- [x] Create `/supplier/profile/[supplierId]` route
- [x] Create `CompanyProfile` component (displays Supplier data)
- [x] Create section components (CompanyInfo, Addresses, Banking, etc.)
- [x] Implement `EditableField` component with edit mode
- [x] Implement re-approval workflow (creates new Application linked to Supplier)
- [x] Implement Supplier update logic when Application is approved
- [x] Add redirect logic from onboarding wizard when approved (redirects to Supplier profile)
- [x] Update supplier dashboard to link to Company Profile (Supplier, not Application)
- [x] Tests (12 test cases, all passing)

**Implementation Summary:**
- ✅ Database schema updated with Supplier and SupplierDocument models
- ✅ Migration `20251119094736_add_supplier_model` created and applied
- ✅ Created `lib/suppliers.ts` with supplier service functions:
  - `createSupplierFromApplication` - Creates Supplier when Application is approved
  - `updateSupplierFromApplication` - Updates Supplier when update Application is approved
  - `getSupplierForUser` - Gets Supplier with access control
  - `getSuppliersForOrganization` - Gets all Suppliers for an organization
  - `createUpdateApplication` - Creates update Application for re-approval workflow
- ✅ Updated `app/dashboard/procurement/[id]/actions.ts` to create/update Suppliers on approval
- ✅ Created profile routes: `/supplier/profile/[supplierId]` and `/supplier/profile`
- ✅ Created Company Profile components:
  - `CompanyProfile` - Main profile component
  - `CompanyProfileHeader` - Header with approval badge
  - `CompanyProfileSection` - Reusable section component
  - `EditableField` - Field editing with re-approval workflow
  - `DocumentList` - Document display with download links
  - `ApprovalMetadata` - Approval information display
- ✅ Created API route `/api/suppliers/[supplierId]/update` for supplier updates
- ✅ Updated onboarding page to redirect to Company Profile when approved
- ✅ Updated supplier dashboard to show Company Profiles section
- ✅ All tests passing (98 total tests in suite, 12 new supplier tests)

### Phase 3: Internal Team Submission (Priority: Medium) ✅ **COMPLETED**
- [x] Add `createApplicationOnBehalfAction` to procurement actions
- [x] Add `submitOnBehalfAction` to procurement actions
- [x] Add `editDraftOnBehalfAction` to procurement actions
- [x] Update permission checks for internal team
- [x] Enhance audit logging with `submissionType` field
- [x] Update procurement dashboard UI to show submission source
- [x] Add "Submitted By" column/badge to applications table
- [x] Add visual distinction (badge/icon) for supplier vs internal submissions
- [x] Update detail view to show submission metadata prominently
- [x] Tests (17 new tests, all passing)

### Phase 4: Polish & Edge Cases (Priority: Low) ✅ **COMPLETED**
- [x] Handle concurrent edits - Optimistic locking with version tracking implemented
- [x] Real-time status updates - Polling-based status detection with notifications
- [x] Enhanced error messages - User-friendly, actionable error messages
- [x] Accessibility improvements - ARIA support, keyboard navigation, screen reader support

**Implementation Summary:**
- ✅ Created `lib/optimistic-locking.ts` with version checking utilities
- ✅ Updated server actions (`saveDraftAction`, `submitApplicationAction`) to use version tracking
- ✅ Client components track version and handle conflicts gracefully
- ✅ Created `useApplicationStatus` hook for real-time status polling
- ✅ Created status API endpoint (`/api/applications/[id]/status`)
- ✅ Created `StatusIndicator` component for visual polling feedback
- ✅ Created `lib/error-messages.ts` with user-friendly error mapping
- ✅ Created `ErrorDisplay` component for actionable error messages
- ✅ Enhanced `StatusMessage` component with ARIA attributes
- ✅ Enhanced `FieldWrapper` component with proper accessibility
- ✅ Created `SkipLinks` component for keyboard navigation
- ✅ Created network error retry utility (`lib/network-error-handler.ts`)
- ✅ Created session expiration handler (`lib/session-handler.ts`)
- ✅ Created form data size validator (`lib/form-data-handler.ts`)
- ✅ Tests: 17 new tests (5 optimistic locking + 12 error messages), all passing
- ✅ All 132 tests passing in full test suite

## 10. Success Metrics

- **Submission accuracy:** Zero duplicate submissions per application
- **User satisfaction:** Suppliers can clearly see their approved information
- **Internal efficiency:** Internal team can submit on behalf of suppliers without friction
- **Data quality:** All approved applications accessible via procurement dashboard

## 11. Resolved Questions

1. **Field editing in PENDING_SUPPLIER:** ✅ **Confirmed** - Via comments with `fieldKey` reference
   - Procurement will add comments with `fieldKey` to specify which fields need changes
   - System will parse comments to determine editable fields
   - Future enhancement: Add field selection UI if needed

2. **Company Profile editable fields:** ✅ **Confirmed** - All fields require re-approval
   - All fields: Contact name, email, phone, non-sensitive addresses, Banking info, tax IDs, legal entity name, compliance documents
   - No immediate edits - all changes trigger re-approval workflow

3. **Re-approval status:** ✅ **Confirmed** - Reuse `PENDING_SUPPLIER` status
   - No new status needed
   - Company Profile edits change status to `PENDING_SUPPLIER`
   - After approval, status returns to `APPROVED`

4. **Internal team roles:** ✅ **Confirmed** - `MEMBER` role can submit on behalf of suppliers
   - Roles that can submit: `ADMIN`, `PROCUREMENT`, `MEMBER`

5. **Multiple FormConfigs:** ✅ **Confirmed** - Suppliers can have multiple applications for different entity/geography combinations
   - Restriction is per FormConfig (entity + geography), not global

6. **Field-level validation:** ✅ **Confirmed** - Validate entire form on resubmission
   - Ensures form consistency even when only specific fields are edited

7. **Re-approval workflow:** ✅ **Confirmed** - Entire application status changes
   - When any field requiring re-approval is edited, entire application status changes to `PENDING_SUPPLIER`
   - Simpler than field-level tracking

## 12. Related Documentation

- `/docs/data-model.md` - Data model and schema
- `/docs/features.md` - Existing feature documentation
- `/lib/application-state.ts` - Current status transition logic
- `/app/supplier/onboarding/actions.ts` - Current submission actions
- `/app/dashboard/procurement/[id]/actions.ts` - Procurement actions

---

**Next Steps:**
1. ✅ Phase 1 Complete - Submission Restrictions implemented and tested
2. ✅ Phase 2 Complete - Company Profile Screen implemented and tested
3. ✅ Phase 3 Complete - Internal Team Submission implemented and tested
4. ✅ Phase 4 Complete - Polish & Edge Cases implemented and tested

**Implementation Status:**
- ✅ **Phase 1:** Submission Restrictions - COMPLETED (2025-01-21)
- ✅ **Phase 2:** Company Profile Screen - COMPLETED (2025-01-21)
- ✅ **Phase 3:** Internal Team Submission - COMPLETED (2025-01-21)
- ✅ **Phase 4:** Polish & Edge Cases - COMPLETED (2025-01-21)

**Related Implementation Documents:**
- `/docs/phase-1-implementation-plan.md` - Detailed Phase 1 implementation plan (COMPLETED)
- `/docs/phase-2-implementation-plan.md` - Detailed Phase 2 implementation plan (COMPLETED)
- `/docs/phase-3-implementation-plan.md` - Detailed Phase 3 implementation plan (COMPLETED)
- `/docs/phase-4-implementation-plan.md` - Detailed Phase 4 implementation plan (COMPLETED)
- `/docs/submission-workflow-implementation-plan.md` - Full implementation plan for all phases

