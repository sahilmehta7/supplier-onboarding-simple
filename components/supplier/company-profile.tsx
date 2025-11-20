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
          data={data.supplierInformation ?? {}}
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
          data={data.addresses ?? {}}
          fields={[
            {
              key: "remitToAddress",
              label: "Remit-To Address",
              type: "address",
            },
            {
              key: "orderingAddress",
              label: "Ordering Address",
              type: "address",
            },
          ]}
        />

        <CompanyProfileSection
          title="Banking Information"
          supplierId={supplier.id}
          data={data.bankInformation ?? {}}
          fields={[
            { key: "bankName", label: "Bank Name" },
            { key: "routingNumber", label: "Routing Number", sensitive: true },
            { key: "accountNumber", label: "Account Number", sensitive: true },
          ]}
        />

        <DocumentList supplierId={supplier.id} documents={supplier.documents} />
      </div>

      <ApprovalMetadata
        approvedAt={supplier.application.approvedAt}
        approvedBy={supplier.application.createdBy}
      />
    </div>
  );
}

