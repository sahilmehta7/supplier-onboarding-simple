"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { MoreHorizontal, Plus } from "lucide-react";

import { jsonRequest } from "@/lib/admin-api";

interface Entity {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface EntityTableProps {
  entities: Entity[];
}

export function EntityTable({ entities }: EntityTableProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [deleteEntity, setDeleteEntity] = useState<Entity | null>(null);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {entities.length} {entities.length === 1 ? "entity" : "entities"}
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New entity
            </Button>
          </DialogTrigger>
          <EntityForm
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
              <TableHead>Name</TableHead>
              <TableHead className="w-40">Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-48 text-right">Updated</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  No entities have been created yet.
                </TableCell>
              </TableRow>
            )}
            {entities.map((entity) => (
              <TableRow key={entity.id}>
                <TableCell className="font-medium text-slate-900">
                  {entity.name}
                </TableCell>
                <TableCell className="uppercase text-xs tracking-wide text-slate-500">
                  {entity.code}
                </TableCell>
                <TableCell className="text-slate-600">
                  {entity.description || "—"}
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">
                  {new Date(entity.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingEntity(entity)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteEntity(entity)}
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

      <EntityForm
        mode="edit"
        entity={editingEntity}
        open={Boolean(editingEntity)}
        onOpenChange={(open) => {
          if (!open) setEditingEntity(null);
        }}
        onSuccess={() => {
          setEditingEntity(null);
          refresh();
        }}
      />

      <DeleteEntityDialog
        entity={deleteEntity}
        open={Boolean(deleteEntity)}
        onOpenChange={(open) => {
          if (!open) setDeleteEntity(null);
        }}
        onSuccess={() => {
          setDeleteEntity(null);
          refresh();
        }}
      />
    </div>
  );
}

interface EntityFormProps {
  mode: "create" | "edit";
  entity?: Entity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function EntityForm({
  mode,
  entity,
  open,
  onOpenChange,
  onSuccess,
}: EntityFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(entity?.name ?? "");
      setCode(entity?.code ?? "");
      setDescription(entity?.description ?? "");
      setError(null);
    }
  }, [entity, open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        setError(null);
        const payload = {
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || null,
        };
        if (mode === "create") {
          await jsonRequest("/api/configuration/entities", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else if (entity) {
          await jsonRequest(`/api/configuration/entities/${entity.id}`, {
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
              {mode === "create" ? "Create entity" : "Edit entity"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              Name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Holdings"
                required
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Code
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="ACM"
                required
                className="mt-1 uppercase"
                maxLength={8}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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

interface DeleteEntityDialogProps {
  entity: Entity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DeleteEntityDialog({
  entity,
  open,
  onOpenChange,
  onSuccess,
}: DeleteEntityDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!entity) return;
    startTransition(async () => {
      try {
        setError(null);
        await jsonRequest(`/api/configuration/entities/${entity.id}`, {
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
          <DialogTitle>Delete entity?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          This action removes {entity?.name}. Existing procurement flows tied to
          this entity may fail to create new applications.
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


