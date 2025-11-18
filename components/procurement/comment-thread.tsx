"use client";

import { useState, useTransition } from "react";
import { addCommentAction } from "@/app/dashboard/procurement/[id]/actions";
import { Badge } from "@/components/ui/badge";

interface Comment {
  id: string;
  body: string;
  visibility: "supplier_visible" | "internal_only" | string;
  createdAt: string | Date;
  author?: {
    name: string | null;
    email: string | null;
  } | null;
}

interface CommentThreadProps {
  applicationId: string;
  comments: Comment[];
}

export function CommentThread({
  applicationId,
  comments,
}: CommentThreadProps) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<
    "supplier_visible" | "internal_only"
  >("supplier_visible");
  const [markPending, setMarkPending] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        await addCommentAction({
          applicationId,
          body,
          visibility,
          markPending,
        });
        setBody("");
        setMessage("Comment posted.");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Failed to post comment."
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a note for suppliers or internal reviewers..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          rows={3}
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <select
            className="rounded-full border border-slate-200 px-3 py-1 text-sm"
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as "supplier_visible" | "internal_only")
            }
          >
            <option value="supplier_visible">Supplier-visible</option>
            <option value="internal_only">Internal only</option>
          </select>
          {visibility === "supplier_visible" && (
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={markPending}
                onChange={(e) => setMarkPending(e.target.checked)}
              />
              Mark status as Pending supplier
            </label>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !body.trim()}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Posting..." : "Add comment"}
          </button>
          {message && <span>{message}</span>}
        </div>
      </div>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-slate-100 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  {comment.author?.name ?? comment.author?.email ?? "Anonymous"}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {comment.visibility === "supplier_visible"
                    ? "Supplier"
                    : "Internal"}
                </Badge>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-slate-900">{comment.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

