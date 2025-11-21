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

  // Delete existing documents first
  await prisma.supplierDocument.deleteMany({
    where: { supplierId: application.supplierId },
  });

  // Update Supplier data
  const supplier = await prisma.supplier.update({
    where: { id: application.supplierId },
    data: {
      data: application.data ?? {},
      updatedAt: new Date(),
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
        include: {
          members: {
            where: { userId },
          },
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

