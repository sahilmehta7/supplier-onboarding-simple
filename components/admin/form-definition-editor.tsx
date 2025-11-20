"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileStack,
  ListTree,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

import { jsonRequest } from "@/lib/admin-api";
import {
  VisibilityRuleBuilder,
  type VisibilityFieldOption,
} from "@/components/admin/visibility-rule-builder";
import type {
  DocumentRequirementSummary,
  DocumentTypeSummary,
  FormDefinitionSummary,
  FormFieldSummary,
  FormSectionSummary,
} from "@/components/admin/form-definition-types";
import type { VisibilityConfig } from "@/lib/forms/types";
import { formatVisibilitySummary } from "@/lib/forms/visibility-format";

interface SectionDialogState {
  section: FormSectionSummary | null;
}

interface FieldDialogState {
  section: FormSectionSummary;
  field: FormFieldSummary | null;
}

interface DocumentDialogState {
  requirement: DocumentRequirementSummary | null;
}

interface FormDefinitionEditorProps {
  form: FormDefinitionSummary;
  documentTypes: DocumentTypeSummary[];
}

export function FormDefinitionEditor({
  form,
  documentTypes,
}: FormDefinitionEditorProps) {
  const router = useRouter();
  const [sectionDialog, setSectionDialog] = useState<SectionDialogState | null>(
    null
  );
  const [sectionDelete, setSectionDelete] =
    useState<FormSectionSummary | null>(null);
  const [fieldDialog, setFieldDialog] = useState<FieldDialogState | null>(null);
  const [fieldDelete, setFieldDelete] = useState<FieldDialogState | null>(null);
  const [documentDialog, setDocumentDialog] =
    useState<DocumentDialogState | null>(null);
  const [documentDelete, setDocumentDelete] =
    useState<DocumentRequirementSummary | null>(null);

  const fieldOptions = useMemo<VisibilityFieldOption[]>(() => {
    return form.sections.flatMap((section) =>
      section.fields.map((field) => ({
        key: field.key,
        label: `${field.label} (${section.label})`,
      }))
    );
  }, [form.sections]);

  const fieldLabelLookup = useMemo<Record<string, string>>(() => {
    const lookup: Record<string, string> = {};
    form.sections.forEach((section) => {
      section.fields.forEach((field) => {
        lookup[field.key] = field.label;
      });
    });
    return lookup;
  }, [form.sections]);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            Form definition
          </p>
          <div className="flex flex-wrap items-center gap-3 text-slate-900">
            <h2 className="text-2xl font-semibold">
              {form.entity.name} • {form.geography.code.toUpperCase()} • v
              {form.version}
            </h2>
            <Badge variant={form.isActive ? "default" : "secondary"}>
              {form.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {form.title && (
            <p className="text-sm font-medium text-slate-700">{form.title}</p>
          )}
          {form.description && (
            <p className="text-sm text-slate-500">{form.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/admin/forms")}
          >
            Back to list
          </Button>
          <Button
            variant="secondary"
            size="sm"
            asChild
            className="gap-2"
          >
            <a href={`/forms/${form.id}`} target="_blank" rel="noreferrer">
              Preview form
            </a>
          </Button>
          <Button
            size="sm"
            onClick={() => setSectionDialog({ section: null })}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add section
          </Button>
        </div>
      </header>

      <div className="space-y-5">
        {form.sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            fieldLabelLookup={fieldLabelLookup}
            onAddField={() =>
              setFieldDialog({
                section,
                field: null,
              })
            }
            onEditSection={() => setSectionDialog({ section })}
            onDeleteSection={() => setSectionDelete(section)}
            onEditField={(field) => setFieldDialog({ section, field })}
            onDeleteField={(field) => setFieldDelete({ section, field })}
          />
        ))}
        <DocumentRequirementsCard
          form={form}
          documentTypes={documentTypes}
          onAdd={() => setDocumentDialog({ requirement: null })}
          onEdit={(requirement) => setDocumentDialog({ requirement })}
          onDelete={setDocumentDelete}
        />
      </div>

      {sectionDialog && (
        <SectionDialog
          formId={form.id}
          mode={sectionDialog.section ? "edit" : "create"}
          section={sectionDialog.section}
          fieldOptions={fieldOptions}
          open={Boolean(sectionDialog)}
          onOpenChange={(open) => {
            if (!open) setSectionDialog(null);
          }}
          onSuccess={() => {
            setSectionDialog(null);
            refresh();
          }}
        />
      )}

      {sectionDelete && (
        <DeleteSectionDialog
          formId={form.id}
          section={sectionDelete}
          open={Boolean(sectionDelete)}
          onOpenChange={(open) => {
            if (!open) setSectionDelete(null);
          }}
          onSuccess={() => {
            setSectionDelete(null);
            refresh();
          }}
        />
      )}

      {fieldDialog && (
        <FieldDialog
          formId={form.id}
          mode={fieldDialog.field ? "edit" : "create"}
          section={fieldDialog.section}
          field={fieldDialog.field}
          open={Boolean(fieldDialog)}
          documentTypes={documentTypes}
          onOpenChange={(open) => {
            if (!open) setFieldDialog(null);
          }}
          onSuccess={() => {
            setFieldDialog(null);
            refresh();
          }}
        />
      )}

      {fieldDelete?.field && (
        <DeleteFieldDialog
          formId={form.id}
          state={fieldDelete}
          open={Boolean(fieldDelete)}
          onOpenChange={(open) => {
            if (!open) setFieldDelete(null);
          }}
          onSuccess={() => {
            setFieldDelete(null);
            refresh();
          }}
        />
      )}

      {documentDialog && (
        <DocumentRequirementDialog
          formId={form.id}
          documentTypes={documentTypes}
          requirement={documentDialog.requirement}
          usedDocumentTypeIds={form.documentRules.map(
            (rule) => rule.documentType.id
          )}
          open={Boolean(documentDialog)}
          onOpenChange={(open) => {
            if (!open) setDocumentDialog(null);
          }}
          onSuccess={() => {
            setDocumentDialog(null);
            refresh();
          }}
        />
      )}

      {documentDelete && (
        <DeleteRequirementDialog
          requirement={documentDelete}
          open={Boolean(documentDelete)}
          onOpenChange={(open) => {
            if (!open) setDocumentDelete(null);
          }}
          onSuccess={() => {
            setDocumentDelete(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function SectionCard({
  section,
  fieldLabelLookup,
  onAddField,
  onEditSection,
  onDeleteSection,
  onEditField,
  onDeleteField,
}: {
  section: FormSectionSummary;
  fieldLabelLookup: Record<string, string>;
  onAddField: () => void;
  onEditSection: () => void;
  onDeleteSection: () => void;
  onEditField: (field: FormFieldSummary) => void;
  onDeleteField: (field: FormFieldSummary) => void;
}) {
  const visibilitySummary = section.visibility
    ? formatVisibilitySummary(section.visibility, {
        getFieldLabel: (key) => fieldLabelLookup[key] ?? key,
      })
    : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-slate-700">
            <ListTree className="h-4 w-4 text-slate-400" />
            <h3 className="text-lg font-semibold">{section.label}</h3>
            {section.visibility && (
              <Badge className="bg-amber-50 text-amber-700" variant="secondary">
                Conditional
              </Badge>
            )}
          </div>
          <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
            {section.key} • order {section.order}
          </p>
          {visibilitySummary && (
            <p className="mt-1 text-xs text-amber-700">
              Visible when {visibilitySummary}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddField}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Field
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditSection}>
                Edit section
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={onDeleteSection}>
                Delete section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead className="w-32">Key</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead className="w-24 text-center">Required</TableHead>
              <TableHead className="w-24 text-center">Order</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.fields.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-6 text-center text-sm text-slate-500"
                >
                  No fields yet. Add the first field.
                </TableCell>
              </TableRow>
            )}
            {section.fields.map((field) => (
              <TableRow key={field.id}>
                <TableCell className="font-medium text-slate-900">
                  {field.label}
                  {field.helpText && (
                    <p className="text-xs text-slate-500">{field.helpText}</p>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs uppercase text-slate-500">
                  {field.key}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{field.type}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={field.required ? "default" : "outline"}>
                    {field.required ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{field.order}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditField(field)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDeleteField(field)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DocumentRequirementsCard({
  form,
  documentTypes,
  onAdd,
  onEdit,
  onDelete,
}: {
  form: FormDefinitionSummary;
  documentTypes: DocumentTypeSummary[];
  onAdd: () => void;
  onEdit: (requirement: DocumentRequirementSummary) => void;
  onDelete: (requirement: DocumentRequirementSummary) => void;
}) {
  const hasDocuments = form.documentRules.length > 0;
  const usedDocumentTypeIds = new Set(
    form.documentRules.map((rule) => rule.documentType.id)
  );
  const canAddDocuments = documentTypes.some(
    (doc) => !usedDocumentTypeIds.has(doc.id)
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700">
          <FileStack className="h-4 w-4 text-slate-400" />
          <div>
            <h3 className="text-lg font-semibold">Required documents</h3>
            <p className="text-xs text-slate-500">
              Linked directly to this form definition.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onAdd}
          disabled={!canAddDocuments}
        >
          <Plus className="h-4 w-4" />
          Add document
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead className="w-32 text-center">Requirement</TableHead>
              <TableHead>Help text</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!hasDocuments && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-sm text-slate-500"
                >
                  No documents linked yet.
                </TableCell>
              </TableRow>
            )}
            {form.documentRules.map((requirement) => (
              <TableRow key={requirement.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">
                      {requirement.documentType.label}
                    </span>
                    <span className="text-xs font-mono uppercase text-slate-400">
                      {requirement.documentType.key}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={requirement.required ? "default" : "outline"}
                    className={!requirement.required ? "text-slate-600" : ""}
                  >
                    {requirement.required ? "Required" : "Optional"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {requirement.helpText || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(requirement)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDelete(requirement)}
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface SectionDialogProps {
  formId: string;
  mode: "create" | "edit";
  section: FormSectionSummary | null;
  fieldOptions: VisibilityFieldOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function SectionDialog({
  formId,
  mode,
  section,
  fieldOptions,
  open,
  onOpenChange,
  onSuccess,
}: SectionDialogProps) {
  const [keyValue, setKeyValue] = useState("");
  const [label, setLabel] = useState("");
  const [order, setOrder] = useState("0");
  const [isConditional, setIsConditional] = useState(false);
  const [visibilityConfig, setVisibilityConfig] =
    useState<VisibilityConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setKeyValue(section?.key ?? "");
      setLabel(section?.label ?? "");
      setOrder(String(section?.order ?? 0));
      setIsConditional(Boolean(section?.visibility));
      setVisibilityConfig(section?.visibility ?? null);
      setError(null);
    }
  }, [open, section]);

  const handleVisibilityModeChange = (mode: "always" | "conditional") => {
    if (mode === "always") {
      setIsConditional(false);
      setVisibilityConfig(null);
      return;
    }
    setIsConditional(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        setError(null);
        const payload: {
          key: string;
          label: string;
          order: number;
          visibility: VisibilityConfig | null;
        } = {
          key: keyValue.trim(),
          label: label.trim(),
          order: Number(order),
          visibility: null,
        };
        if (!payload.key || !payload.label) {
          setError("Key and label are required");
          return;
        }
        if (Number.isNaN(payload.order)) {
          setError("Order must be numeric");
          return;
        }
        if (isConditional) {
          if (!visibilityConfig || visibilityConfig.rules.length === 0) {
            setError("Add at least one visibility rule.");
            return;
          }
          payload.visibility = visibilityConfig;
        }
        if (mode === "create") {
          await jsonRequest(`/api/configuration/forms/${formId}/sections`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else if (section) {
          await jsonRequest(
            `/api/configuration/forms/${formId}/sections/${section.id}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            }
          );
        }
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Add section" : `Edit ${section?.label}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Key
              <Input
                className="mt-1 font-mono text-xs uppercase"
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value)}
                placeholder="company_profile"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Label
              <Input
                className="mt-1"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Company profile"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Order
              <Input
                className="mt-1"
                type="number"
                value={order}
                onChange={(event) => setOrder(event.target.value)}
              />
            </label>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Section visibility
                </p>
                <p className="text-xs text-slate-500">
                  Control when this section is shown to suppliers.
                </p>
              </div>
            </div>
            <label className="text-sm font-medium text-slate-700">
              Mode
              <Select
                value={isConditional ? "conditional" : "always"}
                onValueChange={(value) =>
                  handleVisibilityModeChange(value as "always" | "conditional")
                }
                disabled={isPending}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always visible</SelectItem>
                  <SelectItem value="conditional">
                    Conditional visibility
                  </SelectItem>
                </SelectContent>
              </Select>
            </label>
            {isConditional && (
              <VisibilityRuleBuilder
                fields={fieldOptions}
                value={visibilityConfig}
                onChange={setVisibilityConfig}
                disabled={isPending}
                emptyStateMessage="Add at least one field before enabling conditional visibility."
              />
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : mode === "create"
                ? "Create section"
                : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteSectionDialogProps {
  formId: string;
  section: FormSectionSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DeleteSectionDialog({
  formId,
  section,
  open,
  onOpenChange,
  onSuccess,
}: DeleteSectionDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        setError(null);
        await jsonRequest(
          `/api/configuration/forms/${formId}/sections/${section.id}`,
          { method: "DELETE" }
        );
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete section?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Removing <span className="font-medium">{section.label}</span>
          {section.fields.length > 0
            ? " will delete all of its fields."
            : " cannot be undone."}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldDialogProps {
  formId: string;
  mode: "create" | "edit";
  section: FormSectionSummary;
  field: FormFieldSummary | null;
  open: boolean;
  documentTypes: DocumentTypeSummary[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "select", label: "Select" },
  { value: "multi-select", label: "Multi select" },
  { value: "radio", label: "Radio group" },
  { value: "checkbox", label: "Checkbox" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "document", label: "Document upload" },
];

function getOptionValues(options: unknown): string[] {
  if (
    options &&
    typeof options === "object" &&
    Array.isArray((options as { values?: unknown[] }).values)
  ) {
    const { values } = options as { values?: unknown[] };
    return (values ?? [])
      .map((value) => `${value}`.trim())
      .filter(Boolean);
  }
  return [];
}

function FieldDialog({
  formId,
  mode,
  section,
  field,
  open,
  documentTypes,
  onOpenChange,
  onSuccess,
}: FieldDialogProps) {
  const [label, setLabel] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [type, setType] = useState(FIELD_TYPES[0]?.value ?? "text");
  const [order, setOrder] = useState("0");
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [helpText, setHelpText] = useState("");
  const [optionsInput, setOptionsInput] = useState("");
  const [documentTypeKey, setDocumentTypeKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const documentOptions = documentTypes.map((doc) => ({
    key: doc.key,
    label: `${doc.label} (${doc.category})`,
  }));

  const getDocumentTypeFromOptions = (options: unknown) => {
    if (options && typeof options === "object") {
      const maybeKey = (options as { documentTypeKey?: unknown }).documentTypeKey;
      if (typeof maybeKey === "string") {
        return maybeKey;
      }
    }
    return "";
  };

  useEffect(() => {
    if (open) {
      setLabel(field?.label ?? "");
      setKeyValue(field?.key ?? "");
      setType(field?.type ?? FIELD_TYPES[0]?.value ?? "text");
      setOrder(String(field?.order ?? 0));
      setRequired(field?.required ?? false);
      setPlaceholder(field?.placeholder ?? "");
      setHelpText(field?.helpText ?? "");
      const existingOptions = getOptionValues(field?.options ?? null);
      setOptionsInput(existingOptions.join(", "));
      setDocumentTypeKey(
        getDocumentTypeFromOptions(field?.options ?? null) ||
          documentOptions[0]?.key ||
          ""
      );
      setError(null);
    }
  }, [open, field, documentOptions]);

  useEffect(() => {
    if (type === "document" && !documentTypeKey) {
      setDocumentTypeKey(documentOptions[0]?.key ?? "");
    }
    if (!["select", "multi-select", "radio"].includes(type)) {
      setOptionsInput("");
    }
  }, [type, documentOptions, documentTypeKey]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        setError(null);
        let options: Record<string, unknown> | null = null;
        if (["select", "multi-select", "radio"].includes(type)) {
          const values = optionsInput
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
          options = { values };
        } else if (type === "document") {
          if (!documentTypeKey) {
            setError("Select a document type");
            return;
          }
          options = { documentTypeKey };
        }
        const payload = {
          label: label.trim(),
          key: keyValue.trim(),
          type,
          order: Number(order),
          required,
          placeholder: placeholder.trim() || null,
          helpText: helpText.trim() || null,
          options,
        };
        if (!payload.label || !payload.key) {
          setError("Label and key are required");
          return;
        }
        if (Number.isNaN(payload.order)) {
          setError("Order must be numeric");
          return;
        }
        const baseUrl = `/api/configuration/forms/${formId}/sections/${section.id}/fields`;
        if (mode === "create") {
          await jsonRequest(baseUrl, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else if (field) {
          await jsonRequest(`${baseUrl}/${field.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        }
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create"
                ? `Add field to ${section.label}`
                : `Edit ${field?.label}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Label
              <Input
                className="mt-1"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Key
              <Input
                className="mt-1 font-mono text-xs uppercase"
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value)}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Field type
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Order
              <Input
                className="mt-1"
                type="number"
                value={order}
                onChange={(event) => setOrder(event.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Placeholder
              <Input
                className="mt-1"
                value={placeholder}
                onChange={(event) => setPlaceholder(event.target.value)}
                placeholder="Optional placeholder"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Help text
              <Input
                className="mt-1"
                value={helpText}
                onChange={(event) => setHelpText(event.target.value)}
                placeholder="Shown under the input"
              />
            </label>
          </div>
          {["select", "multi-select", "radio"].includes(type) && (
            <label className="text-sm font-medium text-slate-700">
              Options (comma separated)
              <Input
                className="mt-1"
                value={optionsInput}
                onChange={(event) => setOptionsInput(event.target.value)}
                placeholder="Option A, Option B, Option C"
              />
            </label>
          )}
          {type === "document" && (
            <label className="text-sm font-medium text-slate-700">
              Document type
              <Select
                value={documentTypeKey}
                onValueChange={setDocumentTypeKey}
                disabled={documentOptions.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {documentOptions.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No document types available. Create one first.
                </p>
              )}
            </label>
          )}
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
            />
            Required field
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : mode === "create"
                ? "Create field"
                : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFieldDialog({
  formId,
  state,
  open,
  onOpenChange,
  onSuccess,
}: {
  formId: string;
  state: FieldDialogState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        setError(null);
        await jsonRequest(
          `/api/configuration/forms/${formId}/sections/${state.section.id}/fields/${state.field?.id}`,
          { method: "DELETE" }
        );
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  if (!state.field) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete field?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          This removes <span className="font-medium">{state.field.label}</span>{" "}
          from {state.section.label}. Existing drafts may lose captured data in
          this key.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DocumentRequirementDialogProps {
  formId: string;
  documentTypes: DocumentTypeSummary[];
  requirement: DocumentRequirementSummary | null;
  usedDocumentTypeIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DocumentRequirementDialog({
  formId,
  documentTypes,
  requirement,
  usedDocumentTypeIds,
  open,
  onOpenChange,
  onSuccess,
}: DocumentRequirementDialogProps) {
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [required, setRequired] = useState(true);
  const [helpText, setHelpText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableDocumentTypes = useMemo(() => {
    if (requirement) {
      return documentTypes;
    }
    return documentTypes.filter(
      (doc) => !usedDocumentTypeIds.includes(doc.id)
    );
  }, [documentTypes, requirement, usedDocumentTypeIds]);

  useEffect(() => {
    if (open) {
      setDocumentTypeId(
        requirement?.documentType.id ??
          availableDocumentTypes[0]?.id ??
          ""
      );
      setRequired(requirement?.required ?? true);
      setHelpText(requirement?.helpText ?? "");
      setError(null);
    }
  }, [open, requirement, availableDocumentTypes]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        setError(null);
        await jsonRequest("/api/configuration/requirements", {
          method: "POST",
          body: JSON.stringify({
            formConfigId: formId,
            documentTypeId,
            required,
            helpText: helpText.trim() || null,
          }),
        });
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  const isEdit = Boolean(requirement);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit requirement" : "Add document requirement"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Document type
              <Select
                value={documentTypeId}
                onValueChange={setDocumentTypeId}
                disabled={isEdit || availableDocumentTypes.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {(isEdit ? documentTypes : availableDocumentTypes).map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.label} ({doc.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Requirement
              <Select
                value={required ? "required" : "optional"}
                onValueChange={(value) => setRequired(value === "required")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Help text
              <Input
                className="mt-1"
                value={helpText}
                onChange={(event) => setHelpText(event.target.value)}
                placeholder="Shown to suppliers when uploading"
              />
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !documentTypeId}>
              {isPending ? "Saving..." : isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteRequirementDialogProps {
  requirement: DocumentRequirementSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DeleteRequirementDialog({
  requirement,
  open,
  onOpenChange,
  onSuccess,
}: DeleteRequirementDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!requirement) return;
    startTransition(async () => {
      try {
        setError(null);
        await jsonRequest(`/api/configuration/requirements/${requirement.id}`, {
          method: "DELETE",
        });
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove document requirement?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          This disconnects{" "}
          <span className="font-medium">
            {requirement?.documentType.label}
          </span>{" "}
          from this form definition.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


