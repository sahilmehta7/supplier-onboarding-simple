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
import { StatusIndicator } from "./status-indicator";
import { canEditApplication } from "@/lib/application-validation";
import { useToast } from "@/components/ui/use-toast";
import { useApplicationStatus } from "@/hooks/use-application-status";
import { getUserFriendlyError } from "@/lib/error-messages";
import { useRouter } from "next/navigation";

interface WizardFormProps {
  applicationId: string;
  initialData: SupplierWizardData;
  status: ApplicationStatus;
  editableFields?: string[]; // For PENDING_SUPPLIER state
  version: number;
}

export function SupplierWizardForm({
  applicationId,
  initialData,
  status,
  editableFields = [],
  version: initialVersion,
}: WizardFormProps) {
  const [formData, setFormData] = useState<SupplierWizardData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const [applicationVersion, setApplicationVersion] = useState<number>(initialVersion);
  const { toast } = useToast();
  const router = useRouter();

  // Status polling
  const { status: polledStatus, isPolling } = useApplicationStatus({
    applicationId,
    currentStatus: status,
    enabled: status !== "DRAFT" && status !== "REJECTED",
    onStatusChange: (newStatus) => {
      toast({
        title: "Status updated",
        description: `Application status changed to ${newStatus}`,
      });
      if (newStatus === "APPROVED") {
        router.refresh();
      }
    },
  });

  const displayStatus = polledStatus || status;

  const canEdit = canEditApplication(displayStatus as ApplicationStatus);
  const isPendingSupplier = displayStatus === "PENDING_SUPPLIER";

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
        const result = await saveDraftAction(
          applicationId,
          formData,
          Array.from(editedFields),
          applicationVersion // Pass current version
        );

        // Update version on success
        if (result.version) {
          setApplicationVersion(result.version);
        }

        setStatusMessage("Draft saved.");
        setEditedFields(new Set());
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
        });
      } catch (error) {
        const friendlyMessage = getUserFriendlyError(error as any, {
          action: "save",
          status: displayStatus,
        });

        // Handle version conflicts
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "OPTIMISTIC_LOCK_ERROR"
        ) {
          toast({
            title: "Conflict detected",
            description: friendlyMessage,
            variant: "destructive",
          });
          // Refresh application data
          router.refresh();
        } else {
          setStatusMessage(friendlyMessage);
          toast({
            title: "Error",
            description: friendlyMessage,
            variant: "destructive",
          });
        }
      }
    });
  };

  if (!canEdit && displayStatus !== "DRAFT" && displayStatus !== "PENDING_SUPPLIER") {
    return (
      <div className="space-y-4">
        <StatusMessage status={displayStatus as ApplicationStatus} />
        <StatusIndicator isPolling={isPolling} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm text-slate-600">
      {isPendingSupplier && <StatusMessage status={displayStatus} />}
      <StatusIndicator isPolling={isPolling} />

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

        <div className="grid gap-4 md:grid-cols-2">
          <FieldWrapper
            label="Sales contact name"
            fieldKey="supplierInformation.salesContactName"
            editable={isFieldEditable("supplierInformation.salesContactName")}
          >
            <Input
              value={formData.supplierInformation.salesContactName}
              onChange={(e) =>
                handleSupplierChange("salesContactName", e.target.value)
              }
              disabled={!isFieldEditable("supplierInformation.salesContactName")}
              className="mt-1"
            />
          </FieldWrapper>
          <FieldWrapper
            label="Sales contact email"
            fieldKey="supplierInformation.salesContactEmail"
            editable={isFieldEditable("supplierInformation.salesContactEmail")}
          >
            <Input
              type="email"
              value={formData.supplierInformation.salesContactEmail ?? ""}
              onChange={(e) =>
                handleSupplierChange("salesContactEmail", e.target.value)
              }
              disabled={!isFieldEditable("supplierInformation.salesContactEmail")}
              className="mt-1"
            />
            {errors["supplierInformation.salesContactEmail"] && (
              <p className="text-xs text-red-500">
                {errors["supplierInformation.salesContactEmail"]}
              </p>
            )}
          </FieldWrapper>
        </div>
        <FieldWrapper
          label="Remit-to address line 1"
          fieldKey="addresses.remitToAddress.line1"
          editable={isFieldEditable("addresses.remitToAddress.line1")}
        >
          <Input
            value={formData.addresses.remitToAddress.line1}
            onChange={(e) => handleAddressChange("line1", e.target.value)}
            disabled={!isFieldEditable("addresses.remitToAddress.line1")}
            className="mt-1"
          />
        </FieldWrapper>
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

