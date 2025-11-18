"use client";

import { useState, useTransition } from "react";
import {
  SupplierWizardData,
  supplierWizardSchema,
} from "@/lib/supplierWizardSchema";
import { saveDraftAction } from "@/app/supplier/onboarding/actions";

interface WizardFormProps {
  applicationId: string;
  initialData: SupplierWizardData;
}

export function SupplierWizardForm({
  applicationId,
  initialData,
}: WizardFormProps) {
  const [formData, setFormData] = useState<SupplierWizardData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const handleSupplierChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      supplierInformation: {
        ...prev.supplierInformation,
        [key]: value,
      },
    }));
  };

  const handleAddressChange = (key: string, value: string) => {
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
        await saveDraftAction(applicationId, formData);
        setStatusMessage("Draft saved.");
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : "Failed to save draft."
        );
      }
    });
  };

  return (
    <div className="space-y-6 text-sm text-slate-600">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Supplier name
          </label>
          <input
            value={formData.supplierInformation.supplierName}
            onChange={(e) => handleSupplierChange("supplierName", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
          {errors["supplierInformation.supplierName"] && (
            <p className="text-xs text-red-500">
              {errors["supplierInformation.supplierName"]}
            </p>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500">
              Sales contact name
            </label>
            <input
              value={formData.supplierInformation.salesContactName}
              onChange={(e) =>
                handleSupplierChange("salesContactName", e.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">
              Sales contact email
            </label>
            <input
              value={formData.supplierInformation.salesContactEmail ?? ""}
              onChange={(e) =>
                handleSupplierChange("salesContactEmail", e.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
            {errors["supplierInformation.salesContactEmail"] && (
              <p className="text-xs text-red-500">
                {errors["supplierInformation.salesContactEmail"]}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Remit-to address line 1
          </label>
          <input
            value={formData.addresses.remitToAddress.line1}
            onChange={(e) => handleAddressChange("line1", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-full bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save draft"}
        </button>
        {statusMessage && (
          <p className="text-xs text-slate-500">{statusMessage}</p>
        )}
      </div>
    </div>
  );
}

