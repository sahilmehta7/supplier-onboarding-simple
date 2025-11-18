import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

const ALLOWED_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "select",
  "boolean",
  "date",
]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  const status = message.toLowerCase().includes("unauthorized") ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

function normalizeOptions(rawOptions: unknown): Prisma.InputJsonValue | undefined {
  if (!rawOptions) return undefined;
  if (Array.isArray(rawOptions)) {
    const values = rawOptions
      .map((value) => `${value}`.trim())
      .filter(Boolean);
    return values.length > 0 ? { values } : undefined;
  }
  if (
    typeof rawOptions === "object" &&
    rawOptions !== null &&
    Array.isArray((rawOptions as { values?: unknown[] }).values)
  ) {
    const { values: optionValues } = rawOptions as { values?: unknown[] };
    const values = (optionValues ?? [])
      .map((value) => `${value}`.trim())
      .filter(Boolean);
    return values.length > 0 ? { values } : undefined;
  }
  return undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id, sectionId } = await params;
    const body = await request.json();
    const label = body?.label?.trim();
    const key = body?.key?.trim();
    const type = (body?.type ?? "text").toLowerCase();
    const order = Number(body?.order ?? 0);
    const required = Boolean(body?.required ?? false);

    if (!label) {
      return badRequest("Field label is required");
    }
    if (!key) {
      return badRequest("Field key is required");
    }
    if (Number.isNaN(order)) {
      return badRequest("Field order must be a number");
    }
    if (!ALLOWED_TYPES.has(type)) {
      return badRequest(
        `Field type must be one of ${Array.from(ALLOWED_TYPES).join(", ")}`
      );
    }

    const optionsPayload =
      type === "select"
        ? normalizeOptions(body?.options) ?? Prisma.JsonNull
        : undefined;

    const field = await prisma.formField.create({
      data: {
        sectionId,
        label,
        key,
        type,
        required,
        order,
        placeholder: body?.placeholder?.trim() || null,
        helpText: body?.helpText?.trim() || null,
        options: optionsPayload,
        validation: body?.validation ?? null,
        visibility: body?.visibility ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_FIELD_CREATE",
        details: {
          formConfigId: id,
          sectionId,
          fieldId: field.id,
          label,
          key,
          type,
        },
      },
    });

    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

