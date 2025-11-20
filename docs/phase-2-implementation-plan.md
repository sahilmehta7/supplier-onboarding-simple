# Phase 2: Company Profile Screen - Implementation Plan

**Status:** ✅ **COMPLETED**  
**Last Updated:** 2025-01-21  
**Completed:** 2025-01-21  
**Based on:** `docs/submission-workflow-prd.md`  
**Priority:** High  
**Estimated Time:** 5-7 days

## Overview

Phase 2 implements the Company Profile screen that allows suppliers to view their approved company information and request edits through a re-approval workflow. This phase introduces the Supplier entity model, which represents onboarded suppliers separate from the Application workflow.

---

## Prerequisites

### Required Shadcn Components

All necessary components are already available:
- ✅ `button`, `card`, `badge`, `input`, `label`, `dialog`, `toast`, `skeleton`, `table`, `select`, `checkbox`, `radio-group`, `separator`, `avatar`, `dropdown-menu`, `tooltip`, `progress`, `accordion`, `sheet`, `sidebar`

### Dependencies

- Phase 1 must be completed (Submission Restrictions)
- Database migrations must be run
- Prisma client must be regenerated after schema changes

---

## Implementation Steps

### Step 1: Database Schema Updates

#### 1.1 Add Supplier and SupplierDocument Models

**File:** `prisma/schema.prisma`

Add the following models after the `Application` model:

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

#### 1.2 Update Application Model

**File:** `prisma/schema.prisma`

Add `supplierId` field to the `Application` model:

```prisma
model Application {
  // ... existing fields ...
  supplierId String?     // Link to Supplier if this is an update/re-approval request
  
  // ... existing relations ...
  supplier Supplier? @relation("SupplierUpdateApplications", fields: [supplierId], references: [id])
}
```

#### 1.3 Update Related Models

**File:** `prisma/schema.prisma`

Add Supplier relations to:

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

#### 1.4 Create Migration

```bash
npm run db:migrate -- --name add_supplier_model
npm run prisma:generate
```

**Migration Checklist:**
- [ ] Verify migration SQL is correct
- [ ] Test migration on development database
- [ ] Regenerate Prisma client
- [ ] Verify TypeScript types are updated

---

### Step 2: Supplier Creation Logic

#### 2.1 Create Supplier Service

**File:** `lib/suppliers.ts` (NEW)

Create a service module for Supplier operations:

```typescript
import { prisma } from "@/lib/prisma";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";

/**
 * Creates a Supplier record when an Application is approved
 */
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

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== "APPROVED") {
    throw new Error("Application must be APPROVED to create Supplier");
  }

  // Check if Supplier already exists for this Application
  const existingSupplier = await prisma.supplier.findUnique({
    where: { applicationId: application.id },
  });

  if (existingSupplier) {
    return existingSupplier;
  }

  // Create Supplier record
  const supplier = await prisma.supplier.create({
    data: {
      organizationId: application.organizationId,
      entityId: application.entityId,
      geographyId: application.geographyId,
      applicationId: application.id,
      data: application.data ?? {},
      documents: {
        create: application.documents.map((doc) => ({
          documentTypeId: doc.documentTypeId,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt,
        })),
      },
    },
    include: {
      documents: true,
    },
  });

  return supplier;
}

/**
 * Updates Supplier data when an update Application is approved
 */
export async function updateSupplierFromApplication(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      documents: true,
      supplier: true,
    },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (!application.supplierId) {
    throw new Error("Application must be linked to a Supplier for updates");
  }

  if (application.status !== "APPROVED") {
    throw new Error("Application must be APPROVED to update Supplier");
  }

  // Update Supplier data
  const supplier = await prisma.supplier.update({
    where: { id: application.supplierId },
    data: {
      data: application.data ?? {},
      updatedAt: new Date(),
      documents: {
        deleteMany: {}, // Delete existing documents
        create: application.documents.map((doc) => ({
          documentTypeId: doc.documentTypeId,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt,
        })),
      },
    },
    include: {
      documents: true,
    },
  });

  return supplier;
}

/**
 * Gets Supplier by organization membership
 */
export async function getSupplierForUser(
  supplierId: string,
  userId: string
) {
  return prisma.supplier.findFirst({
    where: {
      id: supplierId,
      organization: {
        members: { some: { userId } },
      },
    },
    include: {
      organization: true,
      entity: true,
      geography: true,
      application: {
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          approvedAt: true,
        },
      },
      documents: {
        include: {
          documentType: true,
        },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });
}

/**
 * Gets all Suppliers for an organization
 */
export async function getSuppliersForOrganization(
  organizationId: string,
  userId: string
) {
  // Verify user is member of organization
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!membership) {
    throw new Error("User is not a member of this organization");
  }

  return prisma.supplier.findMany({
    where: {
      organizationId,
    },
    include: {
      entity: true,
      geography: true,
      application: {
        select: {
          id: true,
          status: true,
          approvedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Creates a new Application for Supplier updates (re-approval workflow)
 */
export async function createUpdateApplication(
  supplierId: string,
  userId: string,
  updatedData: Partial<SupplierWizardData>
) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      organization: {
        members: {
          where: { userId },
        },
      },
      application: {
        include: {
          formConfig: true,
        },
      },
    },
  });

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  if (!supplier.organization.members.length) {
    throw new Error("User is not a member of this organization");
  }

  if (!supplier.application.formConfigId) {
    throw new Error("Original application must have a formConfig");
  }

  // Merge current supplier data with updated fields
  const currentData = supplier.data as SupplierWizardData;
  const mergedData: SupplierWizardData = {
    ...currentData,
    ...updatedData,
    supplierInformation: {
      ...currentData.supplierInformation,
      ...updatedData.supplierInformation,
    },
    addresses: {
      ...currentData.addresses,
      ...updatedData.addresses,
      remitToAddress: {
        ...currentData.addresses?.remitToAddress,
        ...updatedData.addresses?.remitToAddress,
      },
    },
    bankInformation: {
      ...currentData.bankInformation,
      ...updatedData.bankInformation,
    },
  };

  // Create new Application for re-approval
  const application = await prisma.application.create({
    data: {
      organizationId: supplier.organizationId,
      entityId: supplier.entityId,
      geographyId: supplier.geographyId,
      formConfigId: supplier.application.formConfigId,
      status: "DRAFT",
      data: mergedData,
      createdById: userId,
      supplierId: supplier.id,
    },
  });

  return application;
}
```

**Implementation Checklist:**
- [ ] Create `lib/suppliers.ts` with all functions
- [ ] Add proper error handling
- [ ] Add TypeScript types
- [ ] Write unit tests for each function

---

### Step 3: Update Approval Logic

#### 3.1 Update Procurement Actions

**File:** `app/dashboard/procurement/[id]/actions.ts`

Update `transitionApplicationAction` to create/update Supplier when status changes to `APPROVED`:

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
    select: { 
      status: true,
      supplierId: true,
    },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (!canTransition(application.status, targetStatus)) {
    throw new Error("Invalid state transition");
  }

  // Update application status
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
    try {
      if (application.supplierId) {
        // Update existing Supplier
        await updateSupplierFromApplication(applicationId);
      } else {
        // Create new Supplier
        await createSupplierFromApplication(applicationId);
      }
    } catch (error) {
      console.error("Error creating/updating Supplier:", error);
      // Log error but don't fail the transition
      // Supplier creation can be retried later if needed
    }
  }

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  revalidatePath(`/supplier`); // Revalidate supplier dashboard
  console.info(
    `[Transition] Application ${applicationId} -> ${targetStatus} by ${session.user.id}`
  );
  return { ok: true };
}
```

**Implementation Checklist:**
- [ ] Update `transitionApplicationAction` with Supplier creation logic
- [ ] Add error handling for Supplier creation failures
- [ ] Add audit logging for Supplier creation
- [ ] Test approval flow end-to-end

---

### Step 4: Company Profile Route

#### 4.1 Create Profile Page

**File:** `app/supplier/profile/[supplierId]/page.tsx` (NEW)

```typescript
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSupplierForUser } from "@/lib/suppliers";
import { CompanyProfile } from "@/components/supplier/company-profile";

interface Params {
  supplierId: string;
}

export default async function SupplierProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { supplierId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const supplier = await getSupplierForUser(supplierId, session.user.id);

  if (!supplier) {
    notFound();
  }

  return <CompanyProfile supplier={supplier} />;
}
```

#### 4.2 Create Profile Route Alternative (Single Supplier)

**File:** `app/supplier/profile/page.tsx` (NEW)

For organizations with a single supplier, provide a direct route:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSuppliersForOrganization } from "@/lib/suppliers";
import { prisma } from "@/lib/prisma";

export default async function SupplierProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Get user's organization
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (!membership) {
    redirect("/supplier");
  }

  const suppliers = await getSuppliersForOrganization(
    membership.organizationId,
    session.user.id
  );

  if (suppliers.length === 0) {
    redirect("/supplier");
  }

  if (suppliers.length === 1) {
    redirect(`/supplier/profile/${suppliers[0].id}`);
  }

  // Multiple suppliers - show selection page
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          Select Company Profile
        </h1>
        <p className="text-sm text-slate-500">
          You have multiple approved suppliers. Select one to view its profile.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {suppliers.map((supplier) => (
          <a
            key={supplier.id}
            href={`/supplier/profile/${supplier.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-slate-300 transition"
          >
            <h3 className="font-semibold text-slate-900">
              {supplier.entity.name} - {supplier.geography.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Approved {supplier.application.approvedAt?.toLocaleDateString()}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
```

**Implementation Checklist:**
- [ ] Create `/supplier/profile/[supplierId]/page.tsx`
- [ ] Create `/supplier/profile/page.tsx` for single supplier redirect
- [ ] Add proper access control
- [ ] Handle not found cases
- [ ] Add loading states

---

### Step 5: Company Profile Component

#### 5.1 Create Main Profile Component

**File:** `components/supplier/company-profile.tsx` (NEW)

```typescript
"use client";

import { Supplier } from "@prisma/client";
import { CompanyProfileHeader } from "./company-profile-header";
import { CompanyProfileSection } from "./company-profile-section";
import { DocumentList } from "./document-list";
import { ApprovalMetadata } from "./approval-metadata";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";

interface CompanyProfileProps {
  supplier: Supplier & {
    organization: { name: string };
    entity: { name: string; code: string };
    geography: { name: string; code: string };
    application: {
      id: string;
      approvedAt: Date | null;
      createdBy: { name: string | null; email: string | null };
    };
    documents: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      mimeType: string | null;
      fileSize: number | null;
      uploadedAt: Date;
      documentType: { label: string; key: string };
    }>;
  };
}

export function CompanyProfile({ supplier }: CompanyProfileProps) {
  const data = supplier.data as SupplierWizardData;

  return (
    <div className="space-y-8">
      <CompanyProfileHeader
        supplierName={data.supplierInformation?.supplierName ?? "Unknown"}
        entity={supplier.entity}
        geography={supplier.geography}
        approvedAt={supplier.application.approvedAt}
      />

      <div className="grid gap-6">
        <CompanyProfileSection
          title="Company Information"
          supplierId={supplier.id}
          data={data.supplierInformation}
          fields={[
            { key: "supplierName", label: "Supplier Name" },
            { key: "paymentTerms", label: "Payment Terms" },
            { key: "salesContactName", label: "Sales Contact Name" },
            { key: "salesContactEmail", label: "Sales Contact Email" },
          ]}
        />

        <CompanyProfileSection
          title="Addresses"
          supplierId={supplier.id}
          data={data.addresses}
          fields={[
            { key: "remitToAddress", label: "Remit-To Address", type: "address" },
            { key: "orderingAddress", label: "Ordering Address", type: "address" },
          ]}
        />

        <CompanyProfileSection
          title="Banking Information"
          supplierId={supplier.id}
          data={data.bankInformation}
          fields={[
            { key: "bankName", label: "Bank Name" },
            { key: "routingNumber", label: "Routing Number", sensitive: true },
            { key: "accountNumber", label: "Account Number", sensitive: true },
          ]}
        />

        <DocumentList
          supplierId={supplier.id}
          documents={supplier.documents}
        />
      </div>

      <ApprovalMetadata
        approvedAt={supplier.application.approvedAt}
        approvedBy={supplier.application.createdBy}
      />
    </div>
  );
}
```

#### 5.2 Create Profile Header Component

**File:** `components/supplier/company-profile-header.tsx` (NEW)

```typescript
import { Badge } from "@/components/ui/badge";
import { Entity, Geography } from "@prisma/client";

interface CompanyProfileHeaderProps {
  supplierName: string;
  entity: Entity;
  geography: Geography;
  approvedAt: Date | null;
}

export function CompanyProfileHeader({
  supplierName,
  entity,
  geography,
  approvedAt,
}: CompanyProfileHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {supplierName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {entity.name} • {geography.name}
          </p>
        </div>
        <Badge variant="default" className="bg-green-100 text-green-800">
          Approved
        </Badge>
      </div>
      {approvedAt && (
        <p className="text-sm text-slate-500">
          Approved on {approvedAt.toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
```

#### 5.3 Create Profile Section Component

**File:** `components/supplier/company-profile-section.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditableField } from "./editable-field";
import { createUpdateApplication } from "@/lib/suppliers";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";

interface FieldConfig {
  key: string;
  label: string;
  type?: "address" | "text";
  sensitive?: boolean;
}

interface CompanyProfileSectionProps {
  title: string;
  supplierId: string;
  data: Record<string, unknown>;
  fields: FieldConfig[];
}

export function CompanyProfileSection({
  title,
  supplierId,
  data,
  fields,
}: CompanyProfileSectionProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleFieldEdit = async (
    fieldKey: string,
    newValue: unknown
  ) => {
    setIsSubmitting(true);
    try {
      // Create update application
      const updatedData = {
        [fieldKey]: newValue,
      };

      // This will be implemented in the server action
      const response = await fetch(`/api/suppliers/${supplierId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedData }),
      });

      if (!response.ok) {
        throw new Error("Failed to create update request");
      }

      const { applicationId } = await response.json();

      toast({
        title: "Update Request Created",
        description:
          "Your changes have been submitted for re-approval. You'll be notified once approved.",
      });

      router.push(`/supplier/onboarding/${applicationId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create update request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setEditingField(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <EditableField
            key={field.key}
            fieldKey={field.key}
            label={field.label}
            value={data[field.key]}
            type={field.type}
            sensitive={field.sensitive}
            isEditing={editingField === field.key}
            onEdit={() => setEditingField(field.key)}
            onCancel={() => setEditingField(null)}
            onSubmit={(value) => handleFieldEdit(field.key, value)}
            disabled={isSubmitting}
          />
        ))}
      </CardContent>
    </Card>
  );
}
```

#### 5.4 Create Editable Field Component

**File:** `components/supplier/editable-field.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X, Check } from "lucide-react";

interface EditableFieldProps {
  fieldKey: string;
  label: string;
  value: unknown;
  type?: "address" | "text";
  sensitive?: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: (value: unknown) => void;
  disabled?: boolean;
}

export function EditableField({
  fieldKey,
  label,
  value,
  type = "text",
  sensitive = false,
  isEditing,
  onEdit,
  onCancel,
  onSubmit,
  disabled,
}: EditableFieldProps) {
  const [editValue, setEditValue] = useState(value);

  const displayValue = sensitive
    ? maskSensitiveValue(String(value ?? ""))
    : String(value ?? "");

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {type === "address" ? (
          <AddressInput
            value={editValue as Record<string, string>}
            onChange={setEditValue}
          />
        ) : (
          <Input
            value={String(editValue ?? "")}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={disabled}
          />
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onSubmit(editValue)}
            disabled={disabled}
          >
            <Check className="h-4 w-4 mr-1" />
            Submit for Re-approval
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          This change will require re-approval from procurement.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between py-2">
      <div className="flex-1">
        <Label className="text-sm font-medium text-slate-700">{label}</Label>
        <p className="text-sm text-slate-900 mt-1">
          {type === "address" ? formatAddress(value as Record<string, string>) : displayValue}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onEdit}
        className="ml-4"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}

function maskSensitiveValue(value: string): string {
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

function formatAddress(address: Record<string, string>): string {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function AddressInput({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        placeholder="Line 1"
        value={value.line1 ?? ""}
        onChange={(e) => onChange({ ...value, line1: e.target.value })}
      />
      <Input
        placeholder="Line 2 (optional)"
        value={value.line2 ?? ""}
        onChange={(e) => onChange({ ...value, line2: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="City"
          value={value.city ?? ""}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
        />
        <Input
          placeholder="State"
          value={value.state ?? ""}
          onChange={(e) => onChange({ ...value, state: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Postal Code"
          value={value.postalCode ?? ""}
          onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
        />
        <Input
          placeholder="Country"
          value={value.country ?? ""}
          onChange={(e) => onChange({ ...value, country: e.target.value })}
        />
      </div>
    </div>
  );
}
```

#### 5.5 Create Document List Component

**File:** `components/supplier/document-list.tsx` (NEW)

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Link from "next/link";

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedAt: Date;
  documentType: { label: string; key: string };
}

interface DocumentListProps {
  supplierId: string;
  documents: Document[];
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No documents uploaded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {doc.documentType.label}
                </p>
                <p className="text-xs text-slate-500">
                  {doc.fileName} •{" "}
                  {doc.fileSize
                    ? `${(doc.fileSize / 1024).toFixed(1)} KB`
                    : "Unknown size"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                asChild
              >
                <a href={doc.fileUrl} download={doc.fileName} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 5.6 Create Approval Metadata Component

**File:** `components/supplier/approval-metadata.tsx` (NEW)

```typescript
import { Card, CardContent } from "@/components/ui/card";

interface ApprovalMetadataProps {
  approvedAt: Date | null;
  approvedBy: { name: string | null; email: string | null };
}

export function ApprovalMetadata({
  approvedAt,
  approvedBy,
}: ApprovalMetadataProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2 text-sm">
          {approvedAt && (
            <div>
              <span className="font-medium text-slate-700">Approved on:</span>{" "}
              <span className="text-slate-900">
                {approvedAt.toLocaleDateString()} at{" "}
                {approvedAt.toLocaleTimeString()}
              </span>
            </div>
          )}
          {approvedBy.name && (
            <div>
              <span className="font-medium text-slate-700">Approved by:</span>{" "}
              <span className="text-slate-900">
                {approvedBy.name}
                {approvedBy.email && ` (${approvedBy.email})`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Implementation Checklist:**
- [ ] Create all profile components
- [ ] Implement field editing logic
- [ ] Add proper form validation
- [ ] Handle sensitive field masking
- [ ] Add loading and error states
- [ ] Test responsive design

---

### Step 6: Update API Routes

#### 6.1 Create Supplier Update API

**File:** `app/api/suppliers/[supplierId]/update/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createUpdateApplication } from "@/lib/suppliers";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Invalid data provided" },
        { status: 400 }
      );
    }

    const application = await createUpdateApplication(
      supplierId,
      session.user.id,
      data as Partial<SupplierWizardData>
    );

    return NextResponse.json({
      applicationId: application.id,
      message: "Update request created successfully",
    });
  } catch (error) {
    console.error("Error creating update application:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Implementation Checklist:**
- [ ] Create API route for supplier updates
- [ ] Add proper authentication checks
- [ ] Add request validation
- [ ] Add error handling
- [ ] Add audit logging

---

### Step 7: Update Onboarding Redirect Logic

#### 7.1 Update Onboarding Page

**File:** `app/supplier/onboarding/[id]/page.tsx`

Add redirect logic when application is approved:

```typescript
import { redirect } from "next/navigation";
// ... existing imports ...

export default async function OnboardingWizardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  // ... existing code ...

  // Redirect to Company Profile if approved
  if (application.status === "APPROVED") {
    const supplier = await prisma.supplier.findUnique({
      where: { applicationId: application.id },
      select: { id: true },
    });

    if (supplier) {
      redirect(`/supplier/profile/${supplier.id}`);
    }
  }

  // ... rest of existing code ...
}
```

**Implementation Checklist:**
- [ ] Add redirect logic for approved applications
- [ ] Handle case where Supplier doesn't exist yet
- [ ] Add fallback behavior

---

### Step 8: Update Supplier Dashboard

#### 8.1 Update Dashboard to Show Suppliers

**File:** `app/supplier/page.tsx`

Update to show Suppliers for approved applications and link to Company Profile:

```typescript
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSuppliersForOrganization } from "@/lib/suppliers";

export default async function SupplierDashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Get user's organization
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (!membership) {
    return null;
  }

  // Get suppliers
  const suppliers = await getSuppliersForOrganization(
    membership.organizationId,
    session.user.id
  );

  // Get applications (excluding approved ones that have suppliers)
  const applications = await prisma.application.findMany({
    where: {
      organizationId: membership.organizationId,
      status: { not: "APPROVED" }, // Approved apps are shown via Suppliers
    },
    orderBy: { updatedAt: "desc" },
  });

  // ... rest of existing code, but add Suppliers section ...

  return (
    <div className="space-y-8">
      {/* ... existing header and buttons ... */}

      {/* Add Suppliers section */}
      {suppliers.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Company Profiles
            </h2>
            <p className="text-sm text-slate-500">
              View and manage your approved supplier information.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {suppliers.map((supplier) => (
              <Link
                key={supplier.id}
                href={`/supplier/profile/${supplier.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {supplier.entity.name} - {supplier.geography.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Approved{" "}
                      {supplier.application.approvedAt?.toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-900 underline">
                    View Profile
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ... existing applications section ... */}
    </div>
  );
}
```

**Implementation Checklist:**
- [ ] Update dashboard to fetch Suppliers
- [ ] Add Company Profiles section
- [ ] Link to profile pages
- [ ] Update applications section to exclude approved apps with suppliers

---

### Step 9: Testing

#### 9.1 Unit Tests

**File:** `lib/suppliers.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createSupplierFromApplication,
  updateSupplierFromApplication,
  getSupplierForUser,
  createUpdateApplication,
} from "./suppliers";
import { prisma } from "./prisma";

// Mock Prisma
vi.mock("./prisma", () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
    },
    supplier: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe("Supplier Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSupplierFromApplication", () => {
    it("should create a Supplier when Application is approved", async () => {
      // Test implementation
    });

    it("should return existing Supplier if already created", async () => {
      // Test implementation
    });

    it("should throw error if Application is not approved", async () => {
      // Test implementation
    });
  });

  // Add more test cases...
});
```

#### 9.2 Integration Tests

**File:** `tests/supplier-profile.test.ts` (NEW)

Test the complete flow:
1. Application approval → Supplier creation
2. Supplier profile access
3. Field editing → Update application creation
4. Update application approval → Supplier update

#### 9.3 E2E Tests

Test complete user journeys:
1. Supplier submits application → Procurement approves → Supplier views profile
2. Supplier edits profile field → Creates update application → Procurement approves → Supplier sees updated profile

**Testing Checklist:**
- [ ] Write unit tests for `lib/suppliers.ts`
- [ ] Write integration tests for supplier creation/update flow
- [ ] Write E2E tests for profile viewing and editing
- [ ] Test error cases (missing data, unauthorized access, etc.)
- [ ] Test edge cases (multiple suppliers, concurrent edits, etc.)

---

## Implementation Summary

### Files to Create

1. `lib/suppliers.ts` - Supplier service functions
2. `app/supplier/profile/[supplierId]/page.tsx` - Profile page
3. `app/supplier/profile/page.tsx` - Profile redirect page
4. `components/supplier/company-profile.tsx` - Main profile component
5. `components/supplier/company-profile-header.tsx` - Profile header
6. `components/supplier/company-profile-section.tsx` - Profile section
7. `components/supplier/editable-field.tsx` - Editable field component
8. `components/supplier/document-list.tsx` - Document list component
9. `components/supplier/approval-metadata.tsx` - Approval metadata component
10. `app/api/suppliers/[supplierId]/update/route.ts` - Update API route
11. `lib/suppliers.test.ts` - Unit tests
12. `tests/supplier-profile.test.ts` - Integration tests

### Files to Update

1. `prisma/schema.prisma` - Add Supplier and SupplierDocument models
2. `app/dashboard/procurement/[id]/actions.ts` - Update approval logic
3. `app/supplier/onboarding/[id]/page.tsx` - Add redirect logic
4. `app/supplier/page.tsx` - Update dashboard to show Suppliers

### Database Changes

1. Create Supplier table
2. Create SupplierDocument table
3. Add supplierId to Application table
4. Add relations to Organization, Entity, Geography, DocumentType

---

## Success Criteria

- [ ] Supplier is automatically created when Application is approved
- [ ] Supplier profile page displays all approved information
- [ ] Suppliers can view their Company Profile
- [ ] Field editing creates update Application for re-approval
- [ ] Update Application approval updates Supplier data
- [ ] Supplier dashboard shows Company Profiles for approved applications
- [ ] Approved applications redirect to Company Profile
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] UI is responsive and accessible

---

## Next Steps After Phase 2

1. Phase 3: Internal Team Submission
2. Phase 4: Polish & Edge Cases
3. Performance optimization
4. Enhanced error handling
5. Real-time status updates (if needed)

---

## Notes

- All field edits require re-approval - no immediate saves
- Supplier represents the source of truth for approved data
- Applications represent the workflow/approval process
- Company Profile shows Supplier data, not Application data
- Re-approval creates a new Application linked to the Supplier
- Sensitive fields (banking info) should be masked in the UI

