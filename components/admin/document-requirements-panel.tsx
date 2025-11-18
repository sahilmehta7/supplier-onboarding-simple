"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
import { FileStack, MoreHorizontal, Plus } from "lucide-react";

import { jsonRequest } from "@/lib/admin-api";

interface RequirementSummary {
  id: string;
  required: boolean;
  helpText: string | null;
  formConfig: {
    id: string;
    version: number;
    entity: { id: string; name: string; code: string };
    geography: { id: string; name: string; code: string };
  };
  documentType: {
    id: string;
    label: string;
    key: string;
    category: string;
  };
}

interface FormSummary {
  id: string;
  version: number;
  entity: { id: string; name: string; code: string };
  geography: { id: string; name: string; code: string };
}

interface DocumentSummary {
  id: string;
  label: string;
  key: string;
  category: string;
}

interface DocumentRequirementsPanelProps {
  requirements: RequirementSummary[];
  forms: FormSummary[];
  documents: DocumentSummary[];
}

export function DocumentRequirementsPanel({
  requirements,
  forms,
  documents,
}: DocumentRequirementsPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RequirementSummary | null>(null);
  const [deleting, setDeleting] = useState<RequirementSummary | null>(null);

  const refresh = () => router.refresh();

  const requirementLabel = (req: RequirementSummary) =>
    `${req.formConfig.entity.name} • ${req.formConfig.geography.code} • v${req.formConfig.version}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500">
          <FileStack className="h-4 w-4" />
          <span>
            {requirements.length}{" "}
            {requirements.length === 1 ? "requirement" : "requirements"}
          </span>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add requirement
            </Button>
          </DialogTrigger>
          <RequirementDialog
            mode="create"
            forms={forms}
            documents={documents}
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={refresh}
          />
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <TableRow>
              <TableHead>Form config</TableHead>
              <TableHead>Document</TableHead>
              <TableHead className="w-32 text-center">Requirement</TableHead>
              <TableHead>Help text</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  No requirements configured.
                </TableCell>
              </TableRow>
            )}
            {requirements.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="text-sm font-medium text-slate-900">
                  {req.formConfig.entity.name} • {req.formConfig.geography.code} • v
                  {req.formConfig.version}
                </TableCell>
                <TableCell className="text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{req.documentType.category}</Badge>
                    <span>{req.documentType.label}</span>
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    {req.documentType.key}
                  </p>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={req.required ? "default" : "outline"}
                    className={req.required ? "" : "text-slate-500"}
                  >
                    {req.required ? "Required" : "Optional"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {req.helpText || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(req)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleting(req)}
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

      <RequirementDialog
        mode="edit"
        requirement={editing}
        forms={forms}
        documents={documents}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSuccess={() => {
          setEditing(null);
          refresh();
        }}
      />

      <DeleteRequirementDialog
        requirement={deleting}
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onSuccess={() => {
          setDeleting(null);
          refresh();
        }}
      />
    </div>
  );
}

interface RequirementDialogProps {
  mode: "create" | "edit";
  requirement?: RequirementSummary | null;
  forms: FormSummary[];
  documents: DocumentSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function RequirementDialog({
  mode,
  requirement,
  forms,
  documents,
  open,
  onOpenChange,
  onSuccess,
}: RequirementDialogProps) {
  const [formConfigId, setFormConfigId] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [required, setRequired] = useState(true);
  const [helpText, setHelpText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setFormConfigId(
        requirement?.formConfig.id ?? forms[0]?.id ?? ""
      );
      setDocumentTypeId(
        requirement?.documentType.id ?? documents[0]?.id ?? ""
      );
      setRequired(requirement?.required ?? true);
      setHelpText(requirement?.helpText ?? "");
      setError(null);
    }
  }, [open, requirement, forms, documents]);

  const formOptions = useMemo(
    () =>
      forms.map((form) => ({
        id: form.id,
        label: `${form.entity.name} • ${form.geography.code} • v${form.version}`,
      })),
    [forms]
  );

  const documentOptions = useMemo(
    () =>
      documents.map((doc) => ({
        id: doc.id,
        label: `${doc.label} (${doc.category})`,
      })),
    [documents]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        setError(null);
        await jsonRequest("/api/configuration/requirements", {
          method: "POST",
          body: JSON.stringify({
            formConfigId,
            documentTypeId,
            required,
            helpText: helpText.trim() || null,
          }),
        });
        onSuccess();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Add requirement" : "Edit requirement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              Form config
              <Select
                value={formConfigId}
                onValueChange={setFormConfigId}
                disabled={mode === "edit"}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select form config" />
                </SelectTrigger>
                <SelectContent>
                  {formOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Document type
              <Select
                value={documentTypeId}
                onValueChange={setDocumentTypeId}
                disabled={mode === "edit"}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
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
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : mode === "create"
                ? "Create"
                : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteRequirementDialogProps {
  requirement: RequirementSummary | null;
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
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete requirement?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          This disconnects {requirement?.documentType.label} from{" "}
          {requirement?.formConfig.entity.name} •{" "}
          {requirement?.formConfig.geography.code} v
          {requirement?.formConfig.version}.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


