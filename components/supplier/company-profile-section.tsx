"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableField } from "./editable-field";
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

  const handleFieldEdit = async (fieldKey: string, newValue: unknown) => {
    setIsSubmitting(true);
    try {
      // Create update application
      const updatedData = {
        [fieldKey]: newValue,
      };

      const response = await fetch(`/api/suppliers/${supplierId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create update request");
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
        description:
          error instanceof Error
            ? error.message
            : "Failed to create update request. Please try again.",
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

