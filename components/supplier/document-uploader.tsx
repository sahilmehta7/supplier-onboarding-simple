"use client";

import { useState } from "react";

interface DocumentUploaderProps {
  applicationId: string;
}

export function DocumentUploader({ applicationId }: DocumentUploaderProps) {
  const [files, setFiles] = useState<Array<{ name: string; status: string }>>(
    []
  );

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFiles((prev) => [...prev, { name: file.name, status: "Uploading..." }]);

    await fetch("/api/documents/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      }),
    });

    setFiles((prev) =>
      prev.map((entry) =>
        entry.name === file.name
          ? { ...entry, status: "Uploaded (placeholder)" }
          : entry
      )
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-900">Document uploads</p>
      <p className="text-xs text-slate-500">
        W-9, bank letter, and company registration documents. Placeholder uploader.
      </p>
      <input
        type="file"
        className="mt-3 text-sm"
        onChange={handleUpload}
        aria-label="Upload document"
      />
      <ul className="mt-3 space-y-1 text-xs text-slate-500">
        {files.map((file) => (
          <li key={file.name}>
            {file.name} — {file.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

