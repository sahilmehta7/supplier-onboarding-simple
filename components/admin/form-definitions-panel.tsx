"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  FileStack,
  Layers,
  ListTree,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

import { jsonRequest } from "@/lib/admin-api";
import type {
  DocumentRequirementSummary,
  EntitySummary,
  FormDefinitionSummary,
  FormSectionSummary,
  GeographySummary,
} from "@/components/admin/form-definition-types";
import { formatVisibilitySummary } from "@/lib/forms/visibility-format";

const UPDATED_AT_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

interface FormDefinitionsPanelProps {
  forms: FormDefinitionSummary[];
  entities: EntitySummary[];
  geographies: GeographySummary[];
}

export function FormDefinitionsPanel({
  forms,
  entities,
  geographies,
}: FormDefinitionsPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormDefinitionSummary | null>(
    null
  );
  const [deletingForm, setDeletingForm] =
    useState<FormDefinitionSummary | null>(null);
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set());

  const refresh = () => router.refresh();

  const toggleForm = (formId: string) => {
    setExpandedForms((prev) => {
      const next = new Set(prev);
      if (next.has(formId)) {
        next.delete(formId);
      } else {
        next.add(formId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Layers className="h-4 w-4" />
          <span>
            {forms.length}{" "}
            {forms.length === 1 ? "form definition" : "form definitions"}
          </span>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New form config
            </Button>
          </DialogTrigger>
          <FormConfigDialog
            mode="create"
            entities={entities}
            geographies={geographies}
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={() => {
              setCreateOpen(false);
              refresh();
            }}
          />
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <TableRow>
              <TableHead className="w-[320px]">Form</TableHead>
              <TableHead className="w-24 text-center">Version</TableHead>
              <TableHead className="w-32 text-center">Sections</TableHead>
              <TableHead className="w-32 text-center">Documents</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-28 text-center">Status</TableHead>
              <TableHead className="w-56 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-40 text-center text-sm text-slate-500"
                >
                  No form definitions yet. Create one to start mapping schema
                  versions.
                </TableCell>
              </TableRow>
            )}

            {forms.map((form) => {
              const documentRules = form.documentRules ?? [];
              const isExpanded = expandedForms.has(form.id);
              const totalFields = form.sections.reduce(
                (sum, section) => sum + section.fields.length,
                0
              );
              const requiredDocuments = documentRules.filter((rule) => rule.required)
                .length;

              return (
                <Fragment key={form.id}>
                  <TableRow
                    className="align-top transition hover:bg-slate-50/70"
                    data-state={isExpanded ? "open" : "collapsed"}
                  >
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleForm(form.id)}
                        className="flex w-full items-start gap-3 text-left"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown className="mt-1 h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="mt-1 h-4 w-4 text-slate-400" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">
                            {form.entity.name} • {form.geography.code.toUpperCase()}
                          </p>
                          <p className="text-sm text-slate-500">
                            {form.title || "Untitled form"}
                          </p>
                          {form.description && (
                            <p className="text-xs text-slate-400">
                              {form.description}
                            </p>
                          )}
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-700">
                      v{form.version}
                    </TableCell>
                    <TableCell className="text-center">
                      <p className="text-sm font-semibold text-slate-900">
                        {form.sections.length}
                      </p>
                      <p className="text-xs text-slate-500">
                        {totalFields} fields
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <p className="text-sm font-semibold text-slate-900">
                        {documentRules.length}
                      </p>
                      <p className="text-xs text-slate-500">
                        {requiredDocuments} required
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {UPDATED_AT_FORMATTER.format(new Date(form.updatedAt))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={form.isActive ? "default" : "secondary"}>
                        {form.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() =>
                            router.push(`/dashboard/admin/forms/${form.id}`)
                          }
                        >
                          Configure
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/forms/${form.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Preview
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Form actions"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingForm(form)}>
                              Edit metadata
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeletingForm(form)}
                            >
                              Delete config
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-slate-50/70">
                      <TableCell colSpan={7}>
                        <div className="grid gap-6 py-6 lg:grid-cols-[2fr,1fr]">
                          <section className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-slate-600">
                                <ListTree className="h-4 w-4" />
                                <h4 className="text-sm font-semibold uppercase tracking-wide">
                                  Sections overview
                                </h4>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-600 underline-offset-2 hover:underline"
                                onClick={() =>
                                  router.push(`/dashboard/admin/forms/${form.id}`)
                                }
                              >
                                Manage sections
                              </Button>
                            </div>
                            <SectionPreviewList sections={form.sections} />
                          </section>
                          <section className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-slate-600">
                                <FileStack className="h-4 w-4" />
                                <h4 className="text-sm font-semibold uppercase tracking-wide">
                                  Required documents
                                </h4>
                              </div>
                              <Badge variant="secondary">
                                {documentRules.length} items
                              </Badge>
                            </div>
                            <DocumentPreviewList
                              requirements={documentRules}
                            />
                          </section>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <FormConfigDialog
        mode="edit"
        form={editingForm}
        entities={entities}
        geographies={geographies}
        open={Boolean(editingForm)}
        onOpenChange={(open) => {
          if (!open) setEditingForm(null);
        }}
        onSuccess={() => {
          setEditingForm(null);
          refresh();
        }}
      />

      <DeleteFormDialog
        form={deletingForm}
        open={Boolean(deletingForm)}
        onOpenChange={(open) => {
          if (!open) setDeletingForm(null);
        }}
        onSuccess={() => {
          setDeletingForm(null);
          refresh();
        }}
      />
    </div>
  );
}

function SectionPreviewList({
  sections,
}: {
  sections: FormSectionSummary[];
}) {
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No sections configured yet.
      </div>
    );
  }

  const fieldLabelLookup = sections.reduce<Record<string, string>>(
    (lookup, section) => {
      section.fields.forEach((field) => {
        lookup[field.key] = field.label;
      });
      return lookup;
    },
    {}
  );

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div
          key={section.id}
          className="rounded-2xl border border-slate-200 bg-white/70 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {section.label}
                </p>
                {section.visibility && (
                  <Badge className="bg-amber-50 text-amber-700" variant="secondary">
                    Conditional
                  </Badge>
                )}
              </div>
              <p className="text-xs font-mono uppercase text-slate-400">
                {section.key} • order {section.order}
              </p>
              {section.visibility && (
                <p className="mt-1 text-xs text-amber-700">
                  Visible when{" "}
                  {formatVisibilitySummary(section.visibility, {
                    getFieldLabel: (key) => fieldLabelLookup[key] ?? key,
                    joiners: { any: " or " },
                  })}
                </p>
              )}
            </div>
            <Badge variant="secondary">{section.fields.length} fields</Badge>
          </div>

          {section.fields.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No fields in this section.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {section.fields.slice(0, 3).map((field) => (
                <div
                  key={field.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {field.label}
                    </span>
                    <Badge variant="outline">{field.type}</Badge>
                    {field.required && (
                      <Badge
                        variant="default"
                        className="bg-emerald-50 text-emerald-700"
                      >
                        Required
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-xs uppercase text-slate-400">
                    {field.key}
                  </span>
                </div>
              ))}
              {section.fields.length > 3 && (
                <p className="text-xs text-slate-500">
                  +{section.fields.length - 3} more fields
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DocumentPreviewList({
  requirements,
}: {
  requirements: DocumentRequirementSummary[];
}) {
  if (requirements.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No documents linked to this form yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requirements.map((requirement) => (
        <div
          key={requirement.id}
          className="rounded-2xl border border-slate-200 bg-white/70 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {requirement.documentType.label}
              </p>
              <p className="text-xs font-mono uppercase text-slate-400">
                {requirement.documentType.key}
              </p>
            </div>
            <Badge variant={requirement.required ? "default" : "secondary"}>
              {requirement.required ? "Required" : "Optional"}
            </Badge>
          </div>
          {requirement.helpText && (
            <p className="mt-2 text-xs text-slate-500">{requirement.helpText}</p>
          )}
        </div>
      ))}
    </div>
  );
}

interface FormConfigDialogProps {
  mode: "create" | "edit";
  form?: FormDefinitionSummary | null;
  entities: EntitySummary[];
  geographies: GeographySummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function FormConfigDialog({
  mode,
  form,
  entities,
  geographies,
  open,
  onOpenChange,
  onSuccess,
}: FormConfigDialogProps) {
  const [entityId, setEntityId] = useState("");
  const [geographyId, setGeographyId] = useState("");
  const [version, setVersion] = useState("1");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setEntityId(form?.entity.id ?? entities[0]?.id ?? "");
      setGeographyId(form?.geography.id ?? geographies[0]?.id ?? "");
      setVersion(String(form?.version ?? 1));
      setTitle(form?.title ?? "");
      setDescription(form?.description ?? "");
      setIsActive(form?.isActive ?? true);
      setError(null);
    }
  }, [open, form, entities, geographies]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        setError(null);
        const payload = {
          entityId,
          geographyId,
          version: Number(version),
          title: title.trim() || null,
          description: description.trim() || null,
          isActive,
        };
        if (!payload.entityId || !payload.geographyId) {
          setError("Entity and geography are required");
          return;
        }
        if (payload.version < 1 || Number.isNaN(payload.version)) {
          setError("Version must be a positive number");
          return;
        }
        if (mode === "create") {
          await jsonRequest("/api/configuration/forms", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else if (form) {
          await jsonRequest(`/api/configuration/forms/${form.id}`, {
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

  const titleText =
    mode === "create" ? "Create form configuration" : "Edit form configuration";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{titleText}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Entity
              <Select
                value={entityId}
                onValueChange={setEntityId}
                disabled={mode === "edit"}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name} ({entity.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Geography
              <Select
                value={geographyId}
                onValueChange={setGeographyId}
                disabled={mode === "edit"}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select geography" />
                </SelectTrigger>
                <SelectContent>
                  {geographies.map((geo) => (
                    <SelectItem key={geo.id} value={geo.id}>
                      {geo.name} ({geo.code.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Version
              <Input
                className="mt-1"
                type="number"
                min={1}
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Title
              <Input
                className="mt-1"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional display title"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Description
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Active
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteFormDialogProps {
  form: FormDefinitionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DeleteFormDialog({
  form,
  open,
  onOpenChange,
  onSuccess,
}: DeleteFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!form) {
    return null;
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        setError(null);
        await jsonRequest(`/api/configuration/forms/${form.id}`, {
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
          <DialogTitle>Delete form configuration?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          This removes the {form.entity.name} • {form.geography.code.toUpperCase()} v
          {form.version} form. Applications referencing this config will no longer
          load new drafts.
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
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
