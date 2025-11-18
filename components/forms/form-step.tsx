"use client";

import type { FormSection, FormField } from "@prisma/client";
import { cn } from "@/lib/utils";
import { FormFieldRenderer } from "./form-field-renderer";

interface FormStepProps {
  section: FormSection & { fields: FormField[] };
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  visibilityMap?: Record<string, boolean>;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  onFieldBlur: (fieldKey: string) => void;
  applicationId: string | null;
}

export function FormStep({
  section,
  formData,
  errors,
  touched,
  visibilityMap,
  onFieldChange,
  onFieldBlur,
  applicationId,
}: FormStepProps) {
  const sortedFields = [...section.fields].sort((a, b) => a.order - b.order);
  const sectionLabelId = `section-${section.id}-label`;

  return (
    <section className="space-y-6" aria-labelledby={sectionLabelId}>
      <div className="space-y-2">
        <h2 id={sectionLabelId} className="text-2xl font-semibold">
          {section.label}
        </h2>
        {section.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No fields in this section.
          </p>
        )}
      </div>
      {sortedFields.length > 0 && (
        <div
          className="grid gap-6 sm:grid-cols-2"
          role="group"
          aria-labelledby={sectionLabelId}
        >
          {sortedFields.map((field) => {
            const isVisible = visibilityMap?.[field.key] ?? true;
            if (!isVisible) {
              return null;
            }

            const value = formData[field.key];
            const error = errors[field.key];
            const isTouched = touched[field.key] ?? false;
            const shouldSpanFullWidth = ["textarea", "multi-select", "checkbox", "radio", "document"].includes(field.type);

            return (
              <div
                key={field.id}
                className={cn(
                  "flex flex-col gap-2",
                  shouldSpanFullWidth ? "sm:col-span-2" : "sm:col-span-1"
                )}
              >
                <FormFieldRenderer
                  field={field}
                  value={value}
                  onChange={(newValue) => onFieldChange(field.key, newValue)}
                  onBlur={() => onFieldBlur(field.key)}
                  error={isTouched ? error : undefined}
                  touched={isTouched}
                  isVisible={isVisible}
                  applicationId={applicationId}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

