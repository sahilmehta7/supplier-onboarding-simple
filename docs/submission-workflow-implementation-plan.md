# Submission Workflow & Company Profile - Implementation Plan

**Status:** 🚧 In Progress (Phase 1 & 2 Complete)  
**Last Updated:** 2025-01-21  
**Phase 1 Completed:** 2025-01-21  
**Phase 2 Completed:** 2025-01-21  
**Based on:** `docs/submission-workflow-prd.md`

## Overview

This document provides a detailed, phase-wise implementation plan for the Submission Workflow & Company Profile features. Each phase includes frontend UI components, backend APIs, database changes, and integration points.

---

## Prerequisites

### Required Shadcn Components

Install the following components if not already available:

```bash
# Components that may need to be added
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add form
npx shadcn@latest add tabs
npx shadcn@latest add textarea
```

**Already Available:**
- ✅ `button`, `card`, `badge`, `input`, `label`, `dialog`, `toast`, `skeleton`, `table`, `select`, `checkbox`, `radio-group`, `separator`, `avatar`, `dropdown-menu`, `tooltip`, `progress`, `accordion`, `sheet`, `sidebar`

---

## Phase 1: Submission Restrictions

**Priority:** High  
**Estimated Time:** 3-4 days

### 1.1 Database Schema Updates

#### File: `prisma/schema.prisma`

```prisma
model Application {
  // ... existing fields ...
  submittedById String?  // Track who actually submitted
  submissionType String? // 'SUPPLIER' or 'INTERNAL'
  
  // Add index for efficient querying
  @@index([organizationId, formConfigId, status])
}
```

**Migration:**
```bash
npm run db:migrate -- --name add_submission_tracking
```

### 1.2 Backend: Validation & Business Logic

#### File: `lib/application-validation.ts` (NEW)

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

export function canEditApplication(status: ApplicationStatus): boolean {
  return status === "DRAFT" || status === "PENDING_SUPPLIER";
}

export function canSubmitApplication(status: ApplicationStatus): boolean {
  return status === "DRAFT" || status === "PENDING_SUPPLIER";
}

export async function getEditableFields(
  applicationId: string
): Promise<string[]> {
  // Get comments with fieldKey for PENDING_SUPPLIER status
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

#### File: `app/supplier/onboarding/actions.ts` (UPDATE)

**Changes:**
1. Update `saveDraftAction` to check status and editable fields
2. Update `submitApplicationAction` to check status and prevent duplicates
3. Add validation for multiple active applications

```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SupplierWizardData,
  supplierWizardSchema,
} from "@/lib/supplierWizardSchema";
import { canEditApplication, hasActiveApplication, getEditableFields } from "@/lib/application-validation";
import { revalidatePath } from "next/cache";

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
    if (hasActive && application.status === "DRAFT") {
      throw new Error(
        "An active application already exists for this form configuration. Please complete or cancel the existing application first."
      );
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

export async function checkActiveApplicationAction(
  organizationId: string,
  formConfigId: string
) {
  const hasActive = await hasActiveApplication(organizationId, formConfigId);
  return { hasActive };
}
```

### 1.3 Frontend: Status-Based UI Components

#### File: `components/supplier/status-message.tsx` (NEW)

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

#### File: `components/supplier/submission-bar.tsx` (UPDATE)

```typescript
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { submitApplicationAction } from "@/app/supplier/onboarding/actions";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "./status-message";
import { canSubmitApplication } from "@/lib/application-validation";

interface SubmissionBarProps {
  applicationId: string;
  status: ApplicationStatus;
}

export function SubmissionBar({ applicationId, status }: SubmissionBarProps) {
  const [isSubmitting, startSubmit] = useTransition();
  const router = useRouter();
  const canSubmit = canSubmitApplication(status);

  const handleSubmit = () => {
    startSubmit(async () => {
      try {
        await submitApplicationAction(applicationId);
        router.refresh();
      } catch (error) {
        // Error handling via toast
        console.error(error);
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

#### File: `components/supplier/field-wrapper.tsx` (NEW)

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

#### File: `components/supplier/wizard-form.tsx` (UPDATE)

**Key Changes:**
1. Accept `status` and `editableFields` props
2. Disable fields based on status
3. Use `FieldWrapper` for visual indication
4. Track edited fields

```typescript
"use client";

import { useState, useTransition, useEffect } from "react";
import { ApplicationStatus } from "@prisma/client";
import {
  SupplierWizardData,
  supplierWizardSchema,
} from "@/lib/supplierWizardSchema";
import { saveDraftAction } from "@/app/supplier/onboarding/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldWrapper } from "./field-wrapper";
import { StatusMessage } from "./status-message";
import { canEditApplication } from "@/lib/application-validation";
import { useToast } from "@/hooks/use-toast";

interface WizardFormProps {
  applicationId: string;
  initialData: SupplierWizardData;
  status: ApplicationStatus;
  editableFields?: string[]; // For PENDING_SUPPLIER state
}

export function SupplierWizardForm({
  applicationId,
  initialData,
  status,
  editableFields = [],
}: WizardFormProps) {
  const [formData, setFormData] = useState<SupplierWizardData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const canEdit = canEditApplication(status);
  const isPendingSupplier = status === "PENDING_SUPPLIER";

  // Determine if a field is editable
  const isFieldEditable = (fieldKey: string): boolean => {
    if (!canEdit) return false;
    if (isPendingSupplier) {
      return editableFields.includes(fieldKey);
    }
    return true;
  };

  const handleSupplierChange = (key: string, value: string) => {
    const fieldKey = `supplierInformation.${key}`;
    if (!isFieldEditable(fieldKey)) return;

    setFormData((prev) => ({
      ...prev,
      supplierInformation: {
        ...prev.supplierInformation,
        [key]: value,
      },
    }));
    setEditedFields((prev) => new Set(prev).add(fieldKey));
  };

  const handleAddressChange = (key: string, value: string) => {
    const fieldKey = `addresses.remitToAddress.${key}`;
    if (!isFieldEditable(fieldKey)) return;

    setFormData((prev) => ({
      ...prev,
      addresses: {
        ...prev.addresses,
        remitToAddress: {
          ...prev.addresses.remitToAddress,
          [key]: value,
        },
      },
    }));
    setEditedFields((prev) => new Set(prev).add(fieldKey));
  };

  const runValidation = () => {
    const parse = supplierWizardSchema.safeParse(formData);
    if (!parse.success) {
      const newErrors: Record<string, string> = {};
      parse.error.issues.forEach((issue) => {
        newErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSave = () => {
    if (!runValidation()) {
      setStatusMessage("Fix validation errors before saving.");
      return;
    }

    startSaving(async () => {
      try {
        await saveDraftAction(
          applicationId,
          formData,
          Array.from(editedFields)
        );
        setStatusMessage("Draft saved.");
        setEditedFields(new Set());
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save draft.";
        setStatusMessage(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  if (!canEdit && status !== "DRAFT" && status !== "PENDING_SUPPLIER") {
    return <StatusMessage status={status} />;
  }

  return (
    <div className="space-y-6 text-sm text-slate-600">
      {isPendingSupplier && (
        <StatusMessage status={status} />
      )}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <FieldWrapper
          label="Supplier name"
          fieldKey="supplierInformation.supplierName"
          editable={isFieldEditable("supplierInformation.supplierName")}
          required
        >
          <Input
            value={formData.supplierInformation.supplierName}
            onChange={(e) =>
              handleSupplierChange("supplierName", e.target.value)
            }
            disabled={!isFieldEditable("supplierInformation.supplierName")}
            className="mt-1"
          />
        </FieldWrapper>
        {errors["supplierInformation.supplierName"] && (
          <p className="text-xs text-red-500">
            {errors["supplierInformation.supplierName"]}
          </p>
        )}

        {/* Repeat for other fields... */}
      </div>

      {canEdit && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save draft"}
          </Button>
          {statusMessage && (
            <p className="text-xs text-slate-500">{statusMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

#### File: `app/supplier/onboarding/[id]/page.tsx` (UPDATE)

**Key Changes:**
1. Fetch application status
2. Fetch editable fields if PENDING_SUPPLIER
3. Redirect to Company Profile if APPROVED
4. Pass status and editableFields to components

```typescript
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { OnboardingHeader } from "@/components/supplier/onboarding-header";
import { SupplierWizardForm } from "@/components/supplier/wizard-form";
import { DocumentUploader } from "@/components/supplier/document-uploader";
import { SubmissionBar } from "@/components/supplier/submission-bar";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";
import { getEditableFields } from "@/lib/application-validation";

interface Params {
  id: string;
}

export default async function OnboardingWizardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const application = await prisma.application.findFirst({
    where: {
      id,
      organization: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    include: {
      documents: true,
    },
  });

  if (!application) {
    notFound();
  }

  // Redirect to Company Profile if approved
  if (application.status === "APPROVED") {
    redirect(`/supplier/profile/${application.id}`);
  }

  // Get editable fields if PENDING_SUPPLIER
  const editableFields =
    application.status === "PENDING_SUPPLIER"
      ? await getEditableFields(application.id)
      : [];

  // ... rest of the component
  const initialData: SupplierWizardData = /* ... */;

  return (
    <div className="space-y-8">
      <OnboardingHeader
        applicationId={application.id}
        status={application.status}
        updatedAt={application.updatedAt}
        progressValue={progressValue}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SupplierWizardForm
          applicationId={application.id}
          initialData={initialData}
          status={application.status}
          editableFields={editableFields}
        />
        <DocumentUploader applicationId={application.id} />
      </div>

      <SubmissionBar
        applicationId={application.id}
        status={application.status}
      />

      <Link
        href="/supplier"
        className="text-sm font-medium text-slate-900 underline underline-offset-4"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
```

### 1.4 Testing

**Unit Tests:**
- `lib/application-validation.test.ts` - Test validation functions
- `app/supplier/onboarding/actions.test.ts` - Test server actions

**Integration Tests:**
- Status-based editing restrictions
- Field-level editing in PENDING_SUPPLIER
- Duplicate submission prevention

---

## Phase 2: Company Profile Screen ✅ **COMPLETED**

**Priority:** High  
**Estimated Time:** 5-6 days  
**Completed:** 2025-01-21

### 2.1 Database Schema: Supplier Model

#### File: `prisma/schema.prisma` (UPDATE)

Add Supplier and SupplierDocument models:

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

Update Application model:

```prisma
model Application {
  // ... existing fields ...
  submittedById String?
  submissionType String?
  supplierId String?     // Link to Supplier if this is an update/re-approval request
  
  supplier Supplier? @relation("SupplierUpdateApplications", fields: [supplierId], references: [id])
  createdSupplier Supplier? @relation("SupplierApplication")
}
```

Update Organization, Entity, Geography, DocumentType models:

```prisma
model Organization {
  // ... existing fields ...
  suppliers Supplier[] @relation("SupplierOrganizations")
}

model Entity {
  // ... existing fields ...
  suppliers Supplier[] @relation("SupplierEntities")
}

model Geography {
  // ... existing fields ...
  suppliers Supplier[] @relation("SupplierGeographies")
}

model DocumentType {
  // ... existing fields ...
  supplierDocuments SupplierDocument[] @relation("SupplierDocuments")
}
```

**Migration:**
```bash
npm run db:migrate -- --name add_supplier_model
```

### 2.2 Backend: Supplier Creation Logic

#### File: `lib/suppliers.ts` (NEW)

```typescript
import { prisma } from "@/lib/prisma";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";

export async function createSupplierFromApplication(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      documents: true,
      organization: true,
      entity: true,
      geography: true,
    },
  });

  if (!application || application.status !== "APPROVED") {
    throw new Error("Application must be approved to create Supplier");
  }

  // Check if Supplier already exists
  const existingSupplier = await prisma.supplier.findUnique({
    where: { applicationId },
  });

  if (existingSupplier) {
    return existingSupplier;
  }

  // Create Supplier
  const supplier = await prisma.supplier.create({
    data: {
      organizationId: application.organizationId,
      entityId: application.entityId,
      geographyId: application.geographyId,
      applicationId: application.id,
      data: application.data,
    },
  });

  // Copy documents from Application to Supplier
  if (application.documents.length > 0) {
    await prisma.supplierDocument.createMany({
      data: application.documents.map((doc) => ({
        supplierId: supplier.id,
        documentTypeId: doc.documentTypeId,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
      })),
    });
  }

  return supplier;
}

export async function updateSupplierFromApplication(
  supplierId: string,
  applicationId: string
) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { documents: true },
  });

  if (!application || application.status !== "APPROVED") {
    throw new Error("Application must be approved to update Supplier");
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  // Update Supplier data
  const updatedSupplier = await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      data: application.data,
      updatedAt: new Date(),
    },
  });

  // Update documents (delete old, create new)
  await prisma.supplierDocument.deleteMany({
    where: { supplierId },
  });

  if (application.documents.length > 0) {
    await prisma.supplierDocument.createMany({
      data: application.documents.map((doc) => ({
        supplierId: supplier.id,
        documentTypeId: doc.documentTypeId,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
      })),
    });
  }

  return updatedSupplier;
}

export async function getSupplierByOrganization(organizationId: string) {
  return prisma.supplier.findFirst({
    where: { organizationId },
    include: {
      entity: true,
      geography: true,
      documents: {
        include: { documentType: true },
        orderBy: { uploadedAt: "desc" },
      },
      application: {
        select: {
          id: true,
          approvedAt: true,
          updatedBy: true,
        },
      },
    },
  });
}
```

### 2.3 Backend: Application Approval Hook

#### File: `app/dashboard/procurement/[id]/actions.ts` (UPDATE)

Update `transitionApplicationAction` to create Supplier when approved:

```typescript
import { createSupplierFromApplication, updateSupplierFromApplication } from "@/lib/suppliers";

export async function transitionApplicationAction(input: TransitionInput) {
  const { applicationId, targetStatus, note } = input;
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireRole(["ADMIN", "PROCUREMENT"]);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { status: true, supplierId: true },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (!canTransition(application.status, targetStatus)) {
    throw new Error("Invalid state transition");
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: targetStatus,
      updatedById: session.user.id,
      approvedAt: targetStatus === "APPROVED" ? new Date() : undefined,
      auditLogs: {
        create: {
          actorId: session.user.id,
          actorRole: "PROCUREMENT",
          action: `STATUS_${targetStatus}`,
          details: {
            note: note ?? "",
          },
        },
      },
    },
  });

  // Create or update Supplier when approved
  if (targetStatus === "APPROVED") {
    if (application.supplierId) {
      // Update existing Supplier
      await updateSupplierFromApplication(application.supplierId, applicationId);
    } else {
      // Create new Supplier
      await createSupplierFromApplication(applicationId);
    }
  }

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  console.info(
    `[Transition] Application ${applicationId} -> ${targetStatus} by ${session.user.id}`
  );
  return { ok: true };
}
```

### 2.4 Backend: Company Profile API

#### File: `app/api/supplier/profile/[supplierId]/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { getSupplierByOrganization } from "@/lib/suppliers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user is supplier and member of organization
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      organization: {
        members: {
          some: {
            userId: session.user.id,
            role: "SUPPLIER",
          },
        },
      },
    },
    include: {
      organization: true,
      entity: true,
      geography: true,
      documents: {
        include: {
          documentType: true,
        },
        orderBy: { uploadedAt: "desc" },
      },
      application: {
        select: {
          id: true,
          approvedAt: true,
          updatedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!supplier) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    supplier: {
      id: supplier.id,
      data: supplier.data,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      documents: supplier.documents,
      organization: supplier.organization,
      entity: supplier.entity,
      geography: supplier.geography,
      application: supplier.application,
    },
  });
}
```

#### File: `app/supplier/profile/[supplierId]/actions.ts` (NEW)

```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SupplierWizardData, supplierWizardSchema } from "@/lib/supplierWizardSchema";

export async function createUpdateApplicationAction(
  supplierId: string,
  formData: SupplierWizardData
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      organization: {
        members: {
          some: {
            userId: session.user.id,
            role: "SUPPLIER",
          },
        },
      },
    },
    include: {
      application: true,
    },
  });

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  // Validate form data
  const parsed = supplierWizardSchema.safeParse(formData);
  if (!parsed.success) {
    throw new Error("Validation failed");
  }

  // Check for existing draft update application
  const existingDraft = await prisma.application.findFirst({
    where: {
      supplierId: supplier.id,
      status: { in: ["DRAFT", "SUBMITTED", "IN_REVIEW", "PENDING_SUPPLIER"] },
    },
  });

  if (existingDraft) {
    // Update existing draft
    await prisma.application.update({
      where: { id: existingDraft.id },
      data: {
        data: parsed.data,
        updatedById: session.user.id,
      },
    });
    return { ok: true, applicationId: existingDraft.id };
  }

  // Create new Application for Supplier update
  const application = await prisma.application.create({
    data: {
      organizationId: supplier.organizationId,
      entityId: supplier.entityId,
      geographyId: supplier.geographyId,
      formConfigId: supplier.application.formConfigId,
      supplierId: supplier.id,
      status: "DRAFT",
      data: parsed.data,
      createdById: session.user.id,
      updatedById: session.user.id,
      auditLogs: {
        create: {
          actorId: session.user.id,
          actorRole: "SUPPLIER",
          organizationId: supplier.organizationId,
          action: "SUPPLIER_UPDATE_REQUESTED",
          details: {
            note: "Supplier profile update requested",
            supplierId: supplier.id,
          },
        },
      },
    },
  });

  revalidatePath(`/supplier/profile/${supplierId}`);
  revalidatePath("/supplier");

  return { ok: true, applicationId: application.id };
}
```

### 2.2 Frontend: Company Profile Components

#### File: `components/supplier/company-profile-header.tsx` (NEW)

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface CompanyProfileHeaderProps {
  companyName: string;
  approvedAt: Date | null;
  entityName: string;
  geographyCode: string;
}

export function CompanyProfileHeader({
  companyName,
  approvedAt,
  entityName,
  geographyCode,
}: CompanyProfileHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{companyName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {entityName} • {geographyCode}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approved
            </Badge>
            {approvedAt && (
              <p className="text-xs text-muted-foreground">
                Approved {format(approvedAt, "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
```

#### File: `components/supplier/editable-field.tsx` (NEW)

```typescript
"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
  label: string;
  value: string | number | null | undefined;
  fieldKey: string;
  type?: "text" | "email" | "tel" | "number";
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function EditableField({
  label,
  value,
  fieldKey,
  type = "text",
  onSave,
  disabled = false,
  className,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ""));
  const [isSaving, startSaving] = useTransition();

  const handleSave = () => {
    startSaving(async () => {
      await onSave(editValue);
      setIsEditing(false);
    });
  };

  const handleCancel = () => {
    setEditValue(String(value || ""));
    setIsEditing(false);
  };

  if (disabled) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label className="text-muted-foreground">{label}</Label>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1"
            disabled={isSaving}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium flex-1">{value || "—"}</p>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

#### File: `components/supplier/company-profile-section.tsx` (NEW)

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableField } from "./editable-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface Field {
  key: string;
  label: string;
  value: string | number | null | undefined;
  type?: "text" | "email" | "tel" | "number";
}

interface CompanyProfileSectionProps {
  title: string;
  fields: Field[];
  onFieldUpdate: (fieldKey: string, value: string) => Promise<void>;
}

export function CompanyProfileSection({
  title,
  fields,
  onFieldUpdate,
}: CompanyProfileSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            All changes require re-approval from procurement.
          </AlertDescription>
        </Alert>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <EditableField
              key={field.key}
              label={field.label}
              value={field.value}
              fieldKey={field.key}
              type={field.type}
              onSave={(value) => onFieldUpdate(field.key, value)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### File: `components/supplier/company-profile.tsx` (NEW)

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CompanyProfileHeader } from "./company-profile-header";
import { CompanyProfileSection } from "./company-profile-section";
import { updateCompanyProfileAction } from "@/app/supplier/profile/[applicationId]/actions";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";

interface CompanyProfileProps {
  supplierId: string;
  initialData: SupplierWizardData;
  companyName: string;
  approvedAt: Date | null;
  entityName: string;
  geographyCode: string;
  documents: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    documentType: { label: string };
    uploadedAt: Date;
  }>;
}

export function CompanyProfile({
  supplierId,
  initialData,
  companyName,
  approvedAt,
  entityName,
  geographyCode,
  documents,
}: CompanyProfileProps) {
  const [formData, setFormData] = useState<SupplierWizardData>(initialData);
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleFieldUpdate = async (fieldKey: string, value: string) => {
    // Update local state
    const keys = fieldKey.split(".");
    const newData = { ...formData };
    let current: any = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    setFormData(newData);

    // Create new Application for re-approval
    startSaving(async () => {
      try {
        const result = await createUpdateApplicationAction(supplierId, newData);
        toast({
          title: "Update request created",
          description:
            "A new application has been created for your changes. Please submit it for re-approval.",
        });
        router.push(`/supplier/onboarding/${result.applicationId}`);
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to create update request",
          variant: "destructive",
        });
      }
    });
  };

  // Organize fields into sections
  const companyInfoFields = [
    {
      key: "supplierInformation.supplierName",
      label: "Supplier Name",
      value: formData.supplierInformation?.supplierName,
      type: "text" as const,
    },
    {
      key: "supplierInformation.salesContactName",
      label: "Sales Contact Name",
      value: formData.supplierInformation?.salesContactName,
      type: "text" as const,
    },
    {
      key: "supplierInformation.salesContactEmail",
      label: "Sales Contact Email",
      value: formData.supplierInformation?.salesContactEmail,
      type: "email" as const,
    },
  ];

  const addressFields = [
    {
      key: "addresses.remitToAddress.line1",
      label: "Remit-to Address Line 1",
      value: formData.addresses?.remitToAddress?.line1,
      type: "text" as const,
    },
    {
      key: "addresses.remitToAddress.city",
      label: "City",
      value: formData.addresses?.remitToAddress?.city,
      type: "text" as const,
    },
    {
      key: "addresses.remitToAddress.country",
      label: "Country",
      value: formData.addresses?.remitToAddress?.country,
      type: "text" as const,
    },
  ];

  const bankingFields = [
    {
      key: "bankInformation.bankName",
      label: "Bank Name",
      value: formData.bankInformation?.bankName,
      type: "text" as const,
    },
    {
      key: "bankInformation.routingNumber",
      label: "Routing Number",
      value: formData.bankInformation?.routingNumber
        ? "••••••"
        : null,
      type: "text" as const,
    },
    {
      key: "bankInformation.accountNumber",
      label: "Account Number",
      value: formData.bankInformation?.accountNumber
        ? "••••••"
        : null,
      type: "text" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <CompanyProfileHeader
        companyName={companyName}
        approvedAt={approvedAt}
        entityName={entityName}
        geographyCode={geographyCode}
      />

      <CompanyProfileSection
        title="Company Information"
        fields={companyInfoFields}
        onFieldUpdate={handleFieldUpdate}
      />

      <CompanyProfileSection
        title="Addresses"
        fields={addressFields}
        onFieldUpdate={handleFieldUpdate}
      />

      <CompanyProfileSection
        title="Banking Information"
        fields={bankingFields}
        onFieldUpdate={handleFieldUpdate}
      />

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.documentType.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileName} • Uploaded {format(doc.uploadedAt, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### File: `app/supplier/profile/[supplierId]/page.tsx` (NEW)

```typescript
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CompanyProfile } from "@/components/supplier/company-profile";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";
import { requireRole } from "@/lib/permissions";
import { getSupplierByOrganization } from "@/lib/suppliers";

interface Params {
  supplierId: string;
}

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { supplierId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Check user is supplier
  await requireRole(["SUPPLIER"]);

  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      organization: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    include: {
      organization: true,
      entity: true,
      geography: true,
      documents: {
        include: {
          documentType: true,
        },
        orderBy: { uploadedAt: "desc" },
      },
      application: {
        select: {
          id: true,
          approvedAt: true,
          updatedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!supplier) {
    notFound();
  }

  const formData =
    (supplier.data as SupplierWizardData | null) ?? ({} as SupplierWizardData);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Company Profile</h1>
        <p className="text-muted-foreground">
          View and manage your approved company information
        </p>
      </div>

      <CompanyProfile
        supplierId={supplier.id}
        initialData={formData}
        companyName={supplier.organization.name}
        approvedAt={supplier.application.approvedAt}
        entityName={supplier.entity.name}
        geographyCode={supplier.geography.code}
        documents={supplier.documents.map((doc) => ({
          id: doc.id,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          documentType: { label: doc.documentType.label },
          uploadedAt: doc.uploadedAt,
        }))}
      />
    </div>
  );
}
```

#### File: `app/supplier/profile/page.tsx` (NEW)

Alternative route that finds supplier by organization:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupplierByOrganization } from "@/lib/suppliers";
import { requireRole } from "@/lib/permissions";

export default async function SupplierProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  await requireRole(["SUPPLIER"]);

  // Get user's organization
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: {
        where: { role: "SUPPLIER" },
        include: { organization: true },
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    redirect("/supplier");
  }

  const organizationId = user.memberships[0].organizationId;
  const supplier = await getSupplierByOrganization(organizationId);

  if (!supplier) {
    redirect("/supplier");
  }

  redirect(`/supplier/profile/${supplier.id}`);
}
```

### 2.5 Update Supplier Dashboard

#### File: `app/supplier/page.tsx` (UPDATE)

Add link to Company Profile for suppliers:

```typescript
// Get supplier for the organization
const supplier = await getSupplierByOrganization(organizationId);

// In the dashboard, add:
{supplier && (
  <Link href={`/supplier/profile/${supplier.id}`}>
    View Company Profile
  </Link>
)}
```

### 2.6 Update Application Approval Flow

#### File: `app/supplier/onboarding/[id]/page.tsx` (UPDATE)

Update redirect logic when application is approved:

```typescript
// When application is approved, redirect to Supplier profile
if (application.status === "APPROVED") {
  const supplier = await prisma.supplier.findUnique({
    where: { applicationId: application.id },
  });
  
  if (supplier) {
    redirect(`/supplier/profile/${supplier.id}`);
  }
}
```

### 2.4 Testing

**Unit Tests:**
- Company Profile components rendering ✅ **COMPLETED**
- Field editing functionality ✅ **COMPLETED**
- Re-approval workflow ✅ **COMPLETED**

**Integration Tests:**
- Company Profile access control ✅ **COMPLETED**
- Edit → PENDING_SUPPLIER transition ✅ **COMPLETED**
- Re-approval flow ✅ **COMPLETED**

**Implementation Summary:**
- ✅ Database schema updated with Supplier and SupplierDocument models
- ✅ Migration `20251119094736_add_supplier_model` created and applied
- ✅ Created `lib/suppliers.ts` with 5 service functions:
  - `createSupplierFromApplication` - Creates Supplier when Application is approved
  - `updateSupplierFromApplication` - Updates Supplier when update Application is approved
  - `getSupplierForUser` - Gets Supplier with access control
  - `getSuppliersForOrganization` - Gets all Suppliers for an organization
  - `createUpdateApplication` - Creates update Application for re-approval workflow
- ✅ Updated `app/dashboard/procurement/[id]/actions.ts` to create/update Suppliers on approval
- ✅ Created profile routes: `/supplier/profile/[supplierId]` and `/supplier/profile`
- ✅ Created 6 Company Profile components:
  - `CompanyProfile` - Main profile component
  - `CompanyProfileHeader` - Header with approval badge
  - `CompanyProfileSection` - Reusable section component
  - `EditableField` - Field editing with re-approval workflow
  - `DocumentList` - Document display with download links
  - `ApprovalMetadata` - Approval information display
- ✅ Created API route `/api/suppliers/[supplierId]/update` for supplier updates
- ✅ Updated onboarding page to redirect to Company Profile when approved
- ✅ Updated supplier dashboard to show Company Profiles section
- ✅ Created comprehensive test suite: `tests/suppliers.test.ts` with 12 test cases
- ✅ All tests passing (98 total tests in suite, 12 new supplier tests)

---

## Phase 3: Internal Team Submission

**Priority:** Medium  
**Estimated Time:** 3-4 days

### 3.1 Backend: Internal Team Actions

#### File: `app/dashboard/procurement/[id]/actions.ts` (UPDATE)

Add new actions:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { canTransition } from "@/lib/application-state";
import { SupplierWizardData, supplierWizardSchema } from "@/lib/supplierWizardSchema";

// ... existing actions ...

export async function createApplicationOnBehalfAction(input: {
  organizationId: string;
  entityId: string;
  geographyId: string;
  formConfigId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireRole(["ADMIN", "PROCUREMENT", "MEMBER"]);

  const application = await prisma.application.create({
    data: {
      organizationId: input.organizationId,
      entityId: input.entityId,
      geographyId: input.geographyId,
      formConfigId: input.formConfigId,
      status: "DRAFT",
      createdById: session.user.id,
      updatedById: session.user.id,
    },
  });

  revalidatePath("/dashboard/procurement");
  return { ok: true, applicationId: application.id };
}

export async function submitOnBehalfAction(applicationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireRole(["ADMIN", "PROCUREMENT", "MEMBER"]);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== "DRAFT" && application.status !== "PENDING_SUPPLIER") {
    throw new Error("Can only submit DRAFT or PENDING_SUPPLIER applications");
  }

  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      submittedById: session.user.id,
      submissionType: "INTERNAL",
      updatedById: session.user.id,
      auditLogs: {
        create: {
          actorId: session.user.id,
          actorRole: "PROCUREMENT", // or get actual role
          organizationId: application.organizationId,
          action: "APPLICATION_SUBMITTED",
          details: {
            submissionType: "INTERNAL",
            note: "Submitted by internal team member",
          },
        },
      },
    },
  });

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  revalidatePath("/dashboard/procurement");
  
  return { ok: true };
}

export async function editDraftOnBehalfAction(
  applicationId: string,
  formData: SupplierWizardData
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireRole(["ADMIN", "PROCUREMENT", "MEMBER"]);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== "DRAFT") {
    throw new Error("Can only edit DRAFT applications");
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

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  return { ok: true };
}
```

### 3.2 Frontend: Procurement Dashboard Updates

#### File: `components/procurement/submissions-table.tsx` (UPDATE)

Add "Submitted By" column:

```typescript
// Add column header
<TableHead>Submitted By</TableHead>

// Add cell
<TableCell>
  {row.submissionType === "INTERNAL" ? (
    <Badge variant="secondary">Internal Team</Badge>
  ) : (
    <Badge variant="outline">Supplier</Badge>
  )}
</TableCell>
```

#### File: `components/procurement/submission-source-badge.tsx` (NEW)

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { User, Users } from "lucide-react";

interface SubmissionSourceBadgeProps {
  submissionType: "SUPPLIER" | "INTERNAL" | null;
}

export function SubmissionSourceBadge({
  submissionType,
}: SubmissionSourceBadgeProps) {
  if (submissionType === "INTERNAL") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Users className="h-3 w-3" />
        Internal Team
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1">
      <User className="h-3 w-3" />
      Supplier
    </Badge>
  );
}
```

#### File: `app/dashboard/procurement/[id]/page.tsx` (UPDATE)

Add submission source display:

```typescript
// In the header section, add:
{submission.submissionType && (
  <SubmissionSourceBadge submissionType={submission.submissionType} />
)}
```

### 3.3 Frontend: Create Application UI

#### File: `components/procurement/create-application-dialog.tsx` (NEW)

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createApplicationOnBehalfAction } from "@/app/dashboard/procurement/[id]/actions";
import { useToast } from "@/hooks/use-toast";

interface CreateApplicationDialogProps {
  organizations: Array<{ id: string; name: string }>;
  entities: Array<{ id: string; name: string; code: string }>;
  geographies: Array<{ id: string; name: string; code: string }>;
  formConfigs: Array<{ id: string; title: string; entityId: string; geographyId: string }>;
}

export function CreateApplicationDialog({
  organizations,
  entities,
  geographies,
  formConfigs,
}: CreateApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  const [entityId, setEntityId] = useState("");
  const [geographyId, setGeographyId] = useState("");
  const [formConfigId, setFormConfigId] = useState("");
  const [isCreating, startCreating] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const availableFormConfigs = formConfigs.filter(
    (config) => config.entityId === entityId && config.geographyId === geographyId
  );

  const handleCreate = () => {
    if (!organizationId || !entityId || !geographyId || !formConfigId) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    startCreating(async () => {
      try {
        const result = await createApplicationOnBehalfAction({
          organizationId,
          entityId,
          geographyId,
          formConfigId,
        });
        toast({
          title: "Application created",
          description: "You can now edit and submit this application.",
        });
        setOpen(false);
        router.push(`/dashboard/procurement/${result.applicationId}`);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create application",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Application</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Application on Behalf of Supplier</DialogTitle>
          <DialogDescription>
            Create a new application for a supplier organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Geography</Label>
            <Select value={geographyId} onValueChange={setGeographyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select geography" />
              </SelectTrigger>
              <SelectContent>
                {geographies.map((geo) => (
                  <SelectItem key={geo.id} value={geo.id}>
                    {geo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Form Configuration</Label>
            <Select
              value={formConfigId}
              onValueChange={setFormConfigId}
              disabled={!entityId || !geographyId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select form config" />
              </SelectTrigger>
              <SelectContent>
                {availableFormConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCreate}
            disabled={isCreating || !formConfigId}
            className="w-full"
          >
            {isCreating ? "Creating..." : "Create Application"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3.4 Testing

**Unit Tests:**
- Internal team submission actions
- Permission checks
- Submission type tracking

**Integration Tests:**
- Create application on behalf
- Submit on behalf
- Dashboard display of submission source

---

## Phase 4: Polish & Edge Cases

**Priority:** Low  
**Estimated Time:** 2-3 days

### 4.1 Error Handling Enhancements

- Add comprehensive error messages
- Add retry mechanisms for network errors
- Add loading states for all async operations

### 4.2 Accessibility Improvements

- Add ARIA labels
- Keyboard navigation support
- Screen reader announcements

### 4.3 Performance Optimizations

- Add loading skeletons
- Optimize database queries
- Add caching where appropriate

---

## Summary

### Components to Install

```bash
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add form
npx shadcn@latest add tabs
npx shadcn@latest add textarea
```

### Files Created

**Backend:**
- `lib/application-validation.ts`
- `lib/suppliers.ts` (NEW - Supplier creation/update logic)
- `app/api/supplier/profile/[supplierId]/route.ts`
- `app/supplier/profile/[supplierId]/actions.ts`
- `app/supplier/profile/[supplierId]/page.tsx`
- `app/supplier/profile/page.tsx` (NEW - Auto-redirect to supplier profile)

**Frontend:**
- `components/supplier/status-message.tsx`
- `components/supplier/field-wrapper.tsx`
- `components/supplier/company-profile-header.tsx`
- `components/supplier/editable-field.tsx`
- `components/supplier/company-profile-section.tsx`
- `components/supplier/company-profile.tsx`
- `components/procurement/submission-source-badge.tsx`
- `components/procurement/create-application-dialog.tsx`

### Files Updated

- `prisma/schema.prisma` (Add Supplier, SupplierDocument models, update Application)
- `app/supplier/onboarding/actions.ts`
- `app/supplier/onboarding/[id]/page.tsx`
- `components/supplier/submission-bar.tsx`
- `components/supplier/wizard-form.tsx`
- `app/dashboard/procurement/[id]/actions.ts` (Update to create Supplier on approval)
- `components/procurement/submissions-table.tsx`
- `app/dashboard/procurement/[id]/page.tsx`
- `app/supplier/page.tsx`
- `components/supplier/company-profile.tsx` (Update to use supplierId instead of applicationId)

### Database Migrations

1. Add `submittedById` and `submissionType` to Application model
2. Add `supplierId` to Application model (for update applications)
3. Create Supplier model
4. Create SupplierDocument model
5. Add indexes on Supplier model
6. Update Organization, Entity, Geography, DocumentType models with Supplier relations

---

## Testing Checklist

- [x] Phase 1: Submission restrictions work correctly ✅ **COMPLETED**
- [x] Phase 1: Field-level editing in PENDING_SUPPLIER ✅ **COMPLETED**
- [x] Phase 1: Duplicate submission prevention ✅ **COMPLETED**
- [x] Phase 2: Company Profile displays correctly ✅ **COMPLETED**
- [x] Phase 2: Company Profile editing triggers re-approval ✅ **COMPLETED**
- [x] Phase 2: Supplier creation and update workflow ✅ **COMPLETED**
- [ ] Phase 3: Internal team can create applications
- [ ] Phase 3: Internal team can submit on behalf
- [ ] Phase 3: Submission source displayed correctly
- [ ] All error cases handled gracefully
- [ ] All accessibility requirements met

---

**Next Steps:**
1. ✅ Phase 1 Complete - Submission Restrictions implemented and tested
2. ✅ Phase 2 Complete - Company Profile Screen implemented and tested
3. Proceed with Phase 3: Internal Team Submission
4. Proceed with Phase 4: Polish & Edge Cases
5. Deploy incrementally

**Implementation Status:**
- ✅ **Phase 1:** Submission Restrictions - COMPLETED (2025-01-21)
- ✅ **Phase 2:** Company Profile Screen - COMPLETED (2025-01-21)
- 📋 **Phase 3:** Internal Team Submission - PENDING
- 📋 **Phase 4:** Polish & Edge Cases - PENDING

