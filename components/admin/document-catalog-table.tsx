"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, MoreHorizontal, Plus } from "lucide-react";

import { jsonRequest } from "@/lib/admin-api";

interface DocumentTypeSummary {
  id: string;
  key: string;
  label: string;
  category: string;
  description: string | null;
  createdAt?: string | Date;
  updatedAt: string | Date;
}

interface DocumentCatalogTableProps {
  documents: DocumentTypeSummary[];
}

export function DocumentCatalogTable({
  documents,
}: DocumentCatalogTableProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<DocumentTypeSummary | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DocumentTypeSummary | null>(null);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <FileText className="h-4 w-4" />
          <span>
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </span>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New document type
            </Button>
          </DialogTrigger>
          <DocumentForm
            mode="create"
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={refresh}
          />
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead className="w-32">Key</TableHead>
              <TableHead className="w-40">Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-48 text-right">Updated</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  No document types yet. Create one to get started.
                </TableCell>
              </TableRow>
            )}
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium text-slate-900">
                  {doc.label}
                </TableCell>
                <TableCell className="font-mono text-xs uppercase text-slate-500">
                  {doc.key}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{doc.category}</Badge>
                </TableCell>
                <TableCell className="text-slate-600">
                  {doc.description || "—"}
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">
                  {new Date(doc.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditDoc(doc)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteDoc(doc)}
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

      <DocumentForm
        mode="edit"
        document={editDoc}
        open={Boolean(editDoc)}
        onOpenChange={(open) => {
          if (!open) setEditDoc(null);
        }}
        onSuccess={() => {
          setEditDoc(null);
          refresh();
        }}
      />

      <DeleteDocumentDialog
        document={deleteDoc}
        open={Boolean(deleteDoc)}
        onOpenChange={(open) => {
          if (!open) setDeleteDoc(null);
        }}
        onSuccess={() => {
          setDeleteDoc(null);
          refresh();
        }}
      />
    </div>
  );
}

interface DocumentFormProps {
  mode: "create" | "edit";
  document?: DocumentTypeSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DocumentForm({
  mode,
  document,
  open,
  onOpenChange,
  onSuccess,
}: DocumentFormProps) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setLabel(document?.label ?? "");
      setKey(document?.key ?? "");
      setCategory(document?.category ?? "");
      setDescription(document?.description ?? "");
      setError(null);
    }
  }, [document, open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        setError(null);
        const payload = {
          label: label.trim(),
          key: key.trim(),
          category: category.trim(),
          description: description.trim() || null,
        };
        if (mode === "create") {
          await jsonRequest("/api/configuration/documents", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else if (document) {
          await jsonRequest(`/api/configuration/documents/${document.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        }
        onSuccess();
        onOpenChange(false);
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
              {mode === "create" ? "Create document type" : "Edit document type"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
                value={key}
                onChange={(event) =>
                  setKey(event.target.value.replace(/\s+/g, "_"))
                }
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Category
              <Input
                className="mt-1"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="tax, bank, legal"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Description
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
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

interface DeleteDocumentDialogProps {
  document: DocumentTypeSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DeleteDocumentDialog({
  document,
  open,
  onOpenChange,
  onSuccess,
}: DeleteDocumentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!document) return;
    startTransition(async () => {
      try {
        setError(null);
        await jsonRequest(`/api/configuration/documents/${document.id}`, {
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
          <DialogTitle>Delete document type?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          This removes {document?.label}. Requirements referencing this type will
          fail until updated.
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


