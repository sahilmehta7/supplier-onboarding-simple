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
import { Globe, MoreHorizontal, Plus } from "lucide-react";

import { jsonRequest } from "@/lib/admin-api";

interface Geography {
  id: string;
  name: string;
  code: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface GeographyTableProps {
  geographies: Geography[];
}

export function GeographyTable({ geographies }: GeographyTableProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Geography | null>(null);
  const [deleting, setDeleting] = useState<Geography | null>(null);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <Globe className="h-4 w-4" />
          <span>
            {geographies.length} {geographies.length === 1 ? "region" : "regions"}
          </span>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New geography
            </Button>
          </DialogTrigger>
          <GeographyForm
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
              <TableHead className="w-48 text-right">Updated</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {geographies.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500">
                  No geographies yet.
                </TableCell>
              </TableRow>
            )}
            {geographies.map((geo) => (
              <TableRow key={geo.id}>
                <TableCell className="font-medium text-slate-900">
                  {geo.name}
                </TableCell>
                <TableCell className="uppercase text-xs tracking-wide text-slate-500">
                  {geo.code}
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">
                  {new Date(geo.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(geo)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleting(geo)}
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

      <GeographyForm
        mode="edit"
        geography={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSuccess={() => {
          setEditing(null);
          refresh();
        }}
      />

      <DeleteGeographyDialog
        geography={deleting}
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

interface GeographyFormProps {
  mode: "create" | "edit";
  geography?: Geography | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function GeographyForm({
  mode,
  geography,
  open,
  onOpenChange,
  onSuccess,
}: GeographyFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(geography?.name ?? "");
      setCode(geography?.code ?? "");
      setError(null);
    }
  }, [geography, open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        setError(null);
        const payload = { name: name.trim(), code: code.trim() };
        if (mode === "create") {
          await jsonRequest("/api/configuration/geographies", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else if (geography) {
          await jsonRequest(`/api/configuration/geographies/${geography.id}`, {
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Create geography" : "Edit geography"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              Name
              <Input
                className="mt-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="United States"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Code
              <Input
                className="mt-1 uppercase"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="US"
                required
                maxLength={8}
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

interface DeleteGeographyDialogProps {
  geography: Geography | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DeleteGeographyDialog({
  geography,
  open,
  onOpenChange,
  onSuccess,
}: DeleteGeographyDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!geography) return;
    startTransition(async () => {
      try {
        setError(null);
        await jsonRequest(`/api/configuration/geographies/${geography.id}`, {
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
          <DialogTitle>Delete geography?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Removing {geography?.name} prevents future onboarding configs from
          referencing this market.
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


