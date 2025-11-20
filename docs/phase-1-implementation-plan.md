# Phase 1: Submission Restrictions - Detailed Implementation Plan

**Status:** ✅ **COMPLETED**  
**Priority:** High  
**Estimated Time:** 3-4 days  
**Actual Time:** ~1 day  
**Completed:** 2025-01-21  
**Based on:** `docs/submission-workflow-implementation-plan.md` (Phase 1)

---

## Overview

Phase 1 implements submission restrictions and status-based editing controls. This ensures:
- Applications can only be edited/submitted in appropriate statuses
- Field-level editing restrictions for `PENDING_SUPPLIER` status
- Prevention of duplicate active applications
- Clear UI feedback based on application status

---

## Prerequisites Checklist

Before starting, verify:

- [ ] Shadcn UI components are available:
  - [ ] `alert` component
  - [ ] `tooltip` component
  - [ ] `button`, `card`, `badge`, `input`, `label` (already available)
- [ ] Database access configured
- [ ] Application model exists in Prisma schema
- [ ] Current `saveDraftAction` and `submitApplicationAction` are working

---

## Implementation Tasks

### Task 1: Database Schema Updates

**Estimated Time:** 30 minutes  
**Dependencies:** None  
**Priority:** Critical

#### 1.1 Update Prisma Schema

**File:** `prisma/schema.prisma`

**Changes:**
1. Add `submittedById` field to Application model
2. Add `submissionType` field to Application model
3. Add composite index for efficient querying

**Steps:**
1. Open `prisma/schema.prisma`
2. Locate the `Application` model (around line 218)
3. Add the following fields after `submittedAt`:
   ```prisma
   submittedById   String?
   submissionType String? // 'SUPPLIER' or 'INTERNAL'
   ```
4. Add relation for `submittedBy`:
   ```prisma
   submittedBy     User?    @relation("ApplicationSubmittedBy", fields: [submittedById], references: [id])
   ```
5. Add composite index before the closing brace:
   ```prisma
   @@index([organizationId, formConfigId, status])
   ```
6. Update `User` model to include the relation:
   ```prisma
   submittedApplications Application[] @relation("ApplicationSubmittedBy")
   ```

**Checkpoint:**
- [ ] Schema file updated
- [ ] No syntax errors
- [ ] Relations properly defined

#### 1.2 Create Database Migration

**Steps:**
1. Generate migration:
   ```bash
   npm run db:migrate -- --name add_submission_tracking
   ```
   Or if using Prisma directly:
   ```bash
   npx prisma migrate dev --name add_submission_tracking
   ```

2. Verify migration file was created in `prisma/migrations/`

3. Apply migration:
   ```bash
   npm run db:migrate
   ```

4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

**Checkpoint:**
- [ ] Migration file created
- [ ] Migration applied successfully
- [ ] Prisma client regenerated
- [ ] No database errors

**Rollback Plan:**
If migration fails:
```bash
npx prisma migrate reset  # Only in development
# Or manually rollback the migration
```

---

### Task 2: Backend Validation & Business Logic

**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1 complete  
**Priority:** Critical

#### 2.1 Create Application Validation Library

**File:** `lib/application-validation.ts` (NEW)

**Purpose:** Centralized validation logic for application state transitions and editing permissions.

**Steps:**
1. Create new file `lib/application-validation.ts`
2. Implement the following functions:

```typescript
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";

const ACTIVE_STATUSES: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "PENDING_SUPPLIER",
  "APPROVED",
];

/**
 * Check if an organization has an active application for a form config
 */
export async function hasActiveApplication(
  organizationId: string,
  formConfigId: string
): Promise<boolean> {
  const activeApp = await prisma.application.findFirst({
    where: {
      organizationId,
      formConfigId,
      status: { in: ACTIVE_STATUSES },
    },
  });
  return !!activeApp;
}

/**
 * Check if an application can be edited based on its status
 */
export function canEditApplication(status: ApplicationStatus): boolean {
  return status === "DRAFT" || status === "PENDING_SUPPLIER";
}

/**
 * Check if an application can be submitted based on its status
 */
export function canSubmitApplication(status: ApplicationStatus): boolean {
  return status === "DRAFT" || status === "PENDING_SUPPLIER";
}

/**
 * Get list of editable field keys for PENDING_SUPPLIER status
 * Returns field keys from comments that are supplier-visible
 */
export async function getEditableFields(
  applicationId: string
): Promise<string[]> {
  const comments = await prisma.applicationComment.findMany({
    where: {
      applicationId,
      visibility: "supplier_visible",
      fieldKey: { not: null },
    },
    select: { fieldKey: true },
  });
  
  return comments
    .map((c) => c.fieldKey)
    .filter((key): key is string => key !== null);
}
```

**Checkpoint:**
- [ ] File created
- [ ] All functions implemented
- [ ] TypeScript types correct
- [ ] No linting errors

**Testing:**
- [ ] Test `canEditApplication` with all statuses
- [ ] Test `canSubmitApplication` with all statuses
- [ ] Test `hasActiveApplication` with existing/non-existing apps
- [ ] Test `getEditableFields` with/without comments

#### 2.2 Update Server Actions

**File:** `app/supplier/onboarding/actions.ts` (UPDATE)

**Changes Required:**
1. Import validation functions
2. Update `saveDraftAction` to check status and editable fields
3. Update `submitApplicationAction` to check status and prevent duplicates
4. Add `checkActiveApplicationAction` helper

**Steps:**

1. **Add imports** at the top:
```typescript
import { 
  canEditApplication, 
  hasActiveApplication, 
  getEditableFields 
} from "@/lib/application-validation";
import { revalidatePath } from "next/cache";
```

2. **Update `getApplicationForUser` helper** to include formConfig:
```typescript
async function getApplicationForUser(applicationId: string, userId: string) {
  return prisma.application.findFirst({
    where: {
      id: applicationId,
      organization: {
        members: { some: { userId } },
      },
    },
    include: {
      formConfig: true,
    },
  });
}
```

3. **Update `saveDraftAction` signature and implementation**:
```typescript
export async function saveDraftAction(
  applicationId: string,
  formData: SupplierWizardData,
  editedFields?: string[] // Track which fields were edited
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const application = await getApplicationForUser(
    applicationId,
    session.user.id
  );

  if (!application) {
    throw new Error("Application not found");
  }

  // Check if editing is allowed
  if (!canEditApplication(application.status)) {
    throw new Error(
      `Cannot edit application in ${application.status} status. Only DRAFT and PENDING_SUPPLIER applications can be edited.`
    );
  }

  // If PENDING_SUPPLIER, validate only specified fields are edited
  if (application.status === "PENDING_SUPPLIER" && editedFields) {
    const allowedFields = await getEditableFields(applicationId);
    const invalidFields = editedFields.filter(
      (field) => !allowedFields.includes(field)
    );
    if (invalidFields.length > 0) {
      throw new Error(
        `Cannot edit fields: ${invalidFields.join(", ")}. Only specified fields can be edited.`
      );
    }
  }

  const parsed = supplierWizardSchema.safeParse(formData);
  if (!parsed.success) {
    throw new Error("Validation failed");
  }

  await prisma.application.update({
    where: { id: application.id },
    data: {
      data: parsed.data,
      updatedById: session.user.id,
    },
  });

  revalidatePath(`/supplier/onboarding/${applicationId}`);
  return { ok: true };
}
```

4. **Update `submitApplicationAction`**:
```typescript
export async function submitApplicationAction(applicationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const application = await getApplicationForUser(
    applicationId,
    session.user.id
  );

  if (!application) {
    throw new Error("Application not found");
  }

  // Check if submission is allowed
  if (!canSubmitApplication(application.status)) {
    throw new Error(
      `Cannot submit application in ${application.status} status. Only DRAFT and PENDING_SUPPLIER applications can be submitted.`
    );
  }

  // Check for duplicate active applications
  if (application.formConfigId) {
    const hasActive = await hasActiveApplication(
      application.organizationId,
      application.formConfigId
    );
    // Only check for duplicates if this is a DRAFT (not PENDING_SUPPLIER resubmission)
    if (hasActive && application.status === "DRAFT") {
      // Exclude current application from duplicate check
      const otherActive = await prisma.application.findFirst({
        where: {
          organizationId: application.organizationId,
          formConfigId: application.formConfigId,
          status: { in: ACTIVE_STATUSES },
          id: { not: application.id },
        },
      });
      if (otherActive) {
        throw new Error(
          "An active application already exists for this form configuration. Please complete or cancel the existing application first."
        );
      }
    }
  }

  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      submittedById: session.user.id,
      submissionType: "SUPPLIER",
      updatedById: session.user.id,
      auditLogs: {
        create: {
          actorId: session.user.id,
          actorRole: "SUPPLIER",
          organizationId: application.organizationId,
          action: "APPLICATION_SUBMITTED",
          details: {
            submissionType: "SUPPLIER",
            note: "Submitted from supplier portal",
          },
        },
      },
    },
  });

  revalidatePath(`/supplier/onboarding/${applicationId}`);
  revalidatePath("/supplier");
  
  console.info(
    `[Application] ${application.id} submitted by user ${session.user.id}`
  );

  return { ok: true };
}
```

5. **Add new helper action**:
```typescript
export async function checkActiveApplicationAction(
  organizationId: string,
  formConfigId: string
) {
  const hasActive = await hasActiveApplication(organizationId, formConfigId);
  return { hasActive };
}
```

**Checkpoint:**
- [ ] All imports added
- [ ] `saveDraftAction` updated with validation
- [ ] `submitApplicationAction` updated with validation
- [ ] `checkActiveApplicationAction` added
- [ ] No TypeScript errors
- [ ] No linting errors

**Testing:**
- [ ] Test saving draft with DRAFT status (should work)
- [ ] Test saving draft with SUBMITTED status (should fail)
- [ ] Test saving draft with PENDING_SUPPLIER and valid fields (should work)
- [ ] Test saving draft with PENDING_SUPPLIER and invalid fields (should fail)
- [ ] Test submitting DRAFT application (should work)
- [ ] Test submitting SUBMITTED application (should fail)
- [ ] Test duplicate submission prevention

---

### Task 3: Frontend Status-Based UI Components

**Estimated Time:** 3-4 hours  
**Dependencies:** Task 2 complete  
**Priority:** High

#### 3.1 Create Status Message Component

**File:** `components/supplier/status-message.tsx` (NEW)

**Purpose:** Display status-specific messages to users.

**Steps:**
1. Create new file `components/supplier/status-message.tsx`
2. Check if `alert` component exists:
   ```bash
   npx shadcn@latest add alert
   ```
3. Implement component:

```typescript
"use client";

import { ApplicationStatus } from "@prisma/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface StatusMessageProps {
  status: ApplicationStatus;
}

const statusConfig = {
  SUBMITTED: {
    icon: Info,
    message: "This application has been submitted and is under review. You cannot make changes at this time.",
    variant: "default" as const,
  },
  IN_REVIEW: {
    icon: Info,
    message: "Application under review. No changes allowed.",
    variant: "default" as const,
  },
  APPROVED: {
    icon: CheckCircle2,
    message: "This application has been approved. View your Company Profile to see all details.",
    variant: "default" as const,
  },
  REJECTED: {
    icon: XCircle,
    message: "This application has been rejected. You can create a new application if needed.",
    variant: "destructive" as const,
  },
  PENDING_SUPPLIER: {
    icon: AlertCircle,
    message: "Procurement has requested changes to specific fields. Please update the highlighted fields and resubmit.",
    variant: "default" as const,
  },
};

export function StatusMessage({ status }: StatusMessageProps) {
  const config = statusConfig[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Alert variant={config.variant}>
      <Icon className="h-4 w-4" />
      <AlertDescription>{config.message}</AlertDescription>
    </Alert>
  );
}
```

**Checkpoint:**
- [ ] Component created
- [ ] Alert component installed
- [ ] All statuses handled
- [ ] Icons imported correctly
- [ ] No TypeScript errors

**Testing:**
- [ ] Render with each status
- [ ] Verify correct icon and message
- [ ] Verify correct variant (default/destructive)

#### 3.2 Create Field Wrapper Component

**File:** `components/supplier/field-wrapper.tsx` (NEW)

**Purpose:** Visual indication of editable vs non-editable fields.

**Steps:**
1. Create new file `components/supplier/field-wrapper.tsx`
2. Check if `tooltip` component exists:
   ```bash
   npx shadcn@latest add tooltip
   ```
3. Implement component:

```typescript
"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FieldWrapperProps {
  label: string;
  fieldKey: string;
  editable: boolean;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldWrapper({
  label,
  fieldKey,
  editable,
  required,
  helpText,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldKey} className={cn(!editable && "text-muted-foreground")}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {!editable && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>This field was not requested for changes.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div
        className={cn(
          "relative",
          editable && "ring-2 ring-primary/20 rounded-md p-1",
          !editable && "opacity-60"
        )}
      >
        {children}
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
```

**Checkpoint:**
- [ ] Component created
- [ ] Tooltip component installed
- [ ] Visual styling correct (ring for editable, opacity for non-editable)
- [ ] No TypeScript errors

**Testing:**
- [ ] Render with editable=true (should show ring)
- [ ] Render with editable=false (should show opacity and tooltip)
- [ ] Verify tooltip appears on hover

#### 3.3 Update Submission Bar Component

**File:** `components/supplier/submission-bar.tsx` (UPDATE)

**Changes Required:**
1. Accept `status` prop
2. Show status message when submission not allowed
3. Handle REJECTED status specially
4. Update button text for PENDING_SUPPLIER

**Steps:**
1. Open `components/supplier/submission-bar.tsx`
2. Update imports:
```typescript
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { submitApplicationAction } from "@/app/supplier/onboarding/actions";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "./status-message";
import { canSubmitApplication } from "@/lib/application-validation";
import { useToast } from "@/hooks/use-toast";
```

3. Update component:
```typescript
interface SubmissionBarProps {
  applicationId: string;
  status: ApplicationStatus;
}

export function SubmissionBar({ applicationId, status }: SubmissionBarProps) {
  const [isSubmitting, startSubmit] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const canSubmit = canSubmitApplication(status);

  const handleSubmit = () => {
    startSubmit(async () => {
      try {
        await submitApplicationAction(applicationId);
        router.refresh();
        toast({
          title: "Application submitted",
          description: "Your application has been submitted for review.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to submit application",
          variant: "destructive",
        });
      }
    });
  };

  if (!canSubmit && status !== "REJECTED") {
    return <StatusMessage status={status} />;
  }

  if (status === "REJECTED") {
    return (
      <div className="space-y-3">
        <StatusMessage status={status} />
        <Button
          onClick={() => router.push("/supplier/onboarding/new")}
          variant="default"
        >
          Create New Application
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        size="lg"
      >
        {isSubmitting
          ? "Submitting..."
          : status === "PENDING_SUPPLIER"
          ? "Resubmit for Review"
          : "Submit for Review"}
      </Button>
      <p className="text-xs text-slate-500">
        {status === "PENDING_SUPPLIER"
          ? "Resubmitting will send your changes to procurement for review."
          : "Submitting locks edits until procurement requests changes."}
      </p>
    </div>
  );
}
```

**Checkpoint:**
- [ ] Component updated
- [ ] Status prop added
- [ ] Status message displayed when needed
- [ ] Button text changes for PENDING_SUPPLIER
- [ ] Error handling with toast
- [ ] No TypeScript errors

**Testing:**
- [ ] Test with DRAFT status (should show submit button)
- [ ] Test with SUBMITTED status (should show status message)
- [ ] Test with PENDING_SUPPLIER (should show resubmit button)
- [ ] Test with REJECTED (should show message + create new button)
- [ ] Test error handling

#### 3.4 Update Wizard Form Component

**File:** `components/supplier/wizard-form.tsx` (UPDATE - if exists) OR create new

**Note:** This component may need to be created or significantly updated. Check if it exists first.

**Changes Required:**
1. Accept `status` and `editableFields` props
2. Disable fields based on status
3. Use `FieldWrapper` for visual indication
4. Track edited fields
5. Pass edited fields to `saveDraftAction`

**Steps:**
1. Check if `components/supplier/wizard-form.tsx` exists
2. If it exists, update it; if not, create it based on the implementation plan
3. Key changes:
   - Add `status` and `editableFields` props
   - Implement `isFieldEditable` helper function
   - Wrap fields with `FieldWrapper`
   - Track edited fields in state
   - Pass edited fields to `saveDraftAction`
   - Show `StatusMessage` when editing not allowed

**Checkpoint:**
- [ ] Component updated/created
- [ ] Status-based field disabling works
- [ ] FieldWrapper used for all fields
- [ ] Edited fields tracked
- [ ] No TypeScript errors

**Testing:**
- [ ] Fields disabled when status doesn't allow editing
- [ ] Only specified fields editable in PENDING_SUPPLIER
- [ ] Visual indication (ring) for editable fields
- [ ] Edited fields tracked correctly

#### 3.5 Update Onboarding Page

**File:** `app/supplier/onboarding/[id]/page.tsx` (UPDATE)

**Changes Required:**
1. Fetch application status
2. Fetch editable fields if PENDING_SUPPLIER
3. Pass status and editableFields to components
4. Redirect to Company Profile if APPROVED (future Phase 2)

**Steps:**
1. Open `app/supplier/onboarding/[id]/page.tsx`
2. Add imports:
```typescript
import { getEditableFields } from "@/lib/application-validation";
```

3. After fetching application, add:
```typescript
// Get editable fields if PENDING_SUPPLIER
const editableFields =
  application.status === "PENDING_SUPPLIER"
    ? await getEditableFields(application.id)
    : [];
```

4. Update component props:
```typescript
<SubmissionBar
  applicationId={application.id}
  status={application.status}
/>

<SupplierWizardForm
  applicationId={application.id}
  initialData={initialData}
  status={application.status}
  editableFields={editableFields}
/>
```

**Checkpoint:**
- [ ] Page updated
- [ ] Status fetched
- [ ] Editable fields fetched for PENDING_SUPPLIER
- [ ] Props passed correctly
- [ ] No TypeScript errors

**Testing:**
- [ ] Page loads with correct status
- [ ] Editable fields fetched correctly
- [ ] Components receive correct props

---

### Task 4: Testing & Validation

**Estimated Time:** 2-3 hours  
**Dependencies:** Tasks 1-3 complete  
**Priority:** High

#### 4.1 Unit Tests

**File:** `lib/application-validation.test.ts` (NEW)

**Test Cases:**
1. `canEditApplication` - test all statuses
2. `canSubmitApplication` - test all statuses
3. `hasActiveApplication` - test with/without active apps
4. `getEditableFields` - test with/without comments

**Steps:**
1. Create test file
2. Write tests for each function
3. Run tests: `npm test`

**Checkpoint:**
- [ ] Test file created
- [ ] All functions tested
- [ ] Tests pass

#### 4.2 Integration Tests

**Test Scenarios:**
1. **Status-based editing restrictions:**
   - Try to edit DRAFT application (should work)
   - Try to edit SUBMITTED application (should fail)
   - Try to edit APPROVED application (should fail)

2. **Field-level editing in PENDING_SUPPLIER:**
   - Create application with PENDING_SUPPLIER status
   - Add comment with fieldKey
   - Try to edit specified field (should work)
   - Try to edit non-specified field (should fail)

3. **Duplicate submission prevention:**
   - Create and submit application
   - Try to create another DRAFT for same org/formConfig (should be prevented or warned)
   - Try to submit second DRAFT (should fail)

4. **UI Status Messages:**
   - View application with each status
   - Verify correct message displayed
   - Verify fields disabled/enabled correctly

**Checkpoint:**
- [ ] All scenarios tested
- [ ] Edge cases handled
- [ ] Error messages clear

#### 4.3 Manual Testing Checklist

- [ ] Create new application (DRAFT)
- [ ] Edit fields in DRAFT (should work)
- [ ] Submit application
- [ ] Try to edit SUBMITTED application (should fail with message)
- [ ] Change status to PENDING_SUPPLIER (via admin/procurement)
- [ ] Add comment with fieldKey
- [ ] View application as supplier
- [ ] Edit specified field (should work with visual indication)
- [ ] Try to edit non-specified field (should fail)
- [ ] Resubmit application
- [ ] Verify duplicate prevention works

---

## Implementation Order

**Recommended sequence:**

1. ✅ **Task 1** - Database Schema (30 min)
   - Foundation for everything else

2. ✅ **Task 2.1** - Validation Library (1 hour)
   - Core business logic

3. ✅ **Task 2.2** - Server Actions (1-2 hours)
   - Backend validation

4. ✅ **Task 3.1** - Status Message Component (30 min)
   - Simple UI component

5. ✅ **Task 3.2** - Field Wrapper Component (30 min)
   - Visual feedback component

6. ✅ **Task 3.3** - Update Submission Bar (30 min)
   - Uses status message

7. ✅ **Task 3.4** - Update Wizard Form (1-2 hours)
   - Most complex UI change

8. ✅ **Task 3.5** - Update Onboarding Page (30 min)
   - Wire everything together

9. ✅ **Task 4** - Testing (2-3 hours)
   - Validate everything works

**Total Estimated Time:** 7-10 hours (1-2 days)

---

## Rollback Plan

If issues arise:

1. **Database Rollback:**
   ```bash
   npx prisma migrate reset  # Development only
   # Or manually revert migration
   ```

2. **Code Rollback:**
   - Revert changes file by file
   - Keep validation library but disable checks temporarily
   - Use feature flags if needed

3. **Partial Rollback:**
   - Keep database changes
   - Disable UI restrictions temporarily
   - Re-enable gradually

---

## Success Criteria

Phase 1 is complete when:

- [ ] Database schema updated with submission tracking
- [ ] Validation functions work correctly
- [ ] Server actions enforce restrictions
- [ ] UI shows appropriate status messages
- [ ] Fields disabled/enabled based on status
- [ ] Field-level editing works for PENDING_SUPPLIER
- [ ] Duplicate submission prevention works
- [ ] All tests pass
- [ ] Manual testing checklist complete
- [ ] No regressions in existing functionality

---

## Next Steps After Phase 1

Once Phase 1 is complete:

1. Review implementation with team
2. Deploy to staging environment
3. Gather feedback
4. Proceed to Phase 2: Company Profile Screen

---

## Notes & Considerations

- **Performance:** The `hasActiveApplication` check queries the database. Consider caching if needed.
- **Error Messages:** Ensure error messages are user-friendly and actionable.
- **Accessibility:** Ensure disabled fields are properly announced to screen readers.
- **Edge Cases:** Handle cases where formConfigId might be null.
- **Migration Safety:** Test migration on a copy of production data first.

---

**Last Updated:** 2025-01-21  
**Document Version:** 1.0

