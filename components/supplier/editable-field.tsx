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

function maskSensitiveValue(value: string): string {
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

function formatAddress(address: Record<string, string> | undefined): string {
  if (!address || typeof address !== "object") return "";
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
  value: Record<string, string> | undefined;
  onChange: (value: Record<string, string>) => void;
}) {
  const address = value || {};
  return (
    <div className="space-y-2">
      <Input
        placeholder="Line 1"
        value={address.line1 ?? ""}
        onChange={(e) => onChange({ ...address, line1: e.target.value })}
      />
      <Input
        placeholder="Line 2 (optional)"
        value={address.line2 ?? ""}
        onChange={(e) => onChange({ ...address, line2: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="City"
          value={address.city ?? ""}
          onChange={(e) => onChange({ ...address, city: e.target.value })}
        />
        <Input
          placeholder="State"
          value={address.state ?? ""}
          onChange={(e) => onChange({ ...address, state: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Postal Code"
          value={address.postalCode ?? ""}
          onChange={(e) => onChange({ ...address, postalCode: e.target.value })}
        />
        <Input
          placeholder="Country"
          value={address.country ?? ""}
          onChange={(e) => onChange({ ...address, country: e.target.value })}
        />
      </div>
    </div>
  );
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
            value={editValue as Record<string, string> | undefined}
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
          {type === "address"
            ? formatAddress(value as Record<string, string> | undefined)
            : displayValue}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={onEdit} className="ml-4">
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}

