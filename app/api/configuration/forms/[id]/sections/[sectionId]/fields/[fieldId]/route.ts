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

function normalizeOptions(
  rawOptions: unknown
): Prisma.InputJsonValue | undefined {
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

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; sectionId: string; fieldId: string }>;
  }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id, sectionId, fieldId } = await params;
    const body = await request.json();
    const data: Prisma.FormFieldUncheckedUpdateInput = {};
    const auditData: Prisma.JsonObject = {};

    if (body?.label !== undefined) {
      const label = body.label.trim();
      if (!label) {
        return badRequest("Field label cannot be empty");
      }
      data.label = label;
      auditData.label = label;
    }

    if (body?.key !== undefined) {
      const key = body.key.trim();
      if (!key) {
        return badRequest("Field key cannot be empty");
      }
      data.key = key;
      auditData.key = key;
    }

    if (body?.type !== undefined) {
      const type = body.type.toLowerCase();
      if (!ALLOWED_TYPES.has(type)) {
        return badRequest(
          `Field type must be one of ${Array.from(ALLOWED_TYPES).join(", ")}`
        );
      }
      data.type = type;
      auditData.type = type;
      const normalizedOptions =
        type === "select"
          ? normalizeOptions(body?.options) ?? Prisma.JsonNull
          : Prisma.JsonNull;
      data.options = normalizedOptions;
      auditData.options = (
        normalizedOptions === Prisma.JsonNull ? null : normalizedOptions
      ) as Prisma.JsonValue;
    } else if (body?.options !== undefined) {
      const normalizedOptions = normalizeOptions(body.options) ?? Prisma.JsonNull;
      data.options = normalizedOptions;
      auditData.options = (
        normalizedOptions === Prisma.JsonNull ? null : normalizedOptions
      ) as Prisma.JsonValue;
    }

    if (body?.order !== undefined) {
      const order = Number(body.order);
      if (Number.isNaN(order)) {
        return badRequest("Field order must be numeric");
      }
      data.order = order;
      auditData.order = order;
    }

    if (body?.required !== undefined) {
      const required = Boolean(body.required);
      data.required = required;
      auditData.required = required;
    }

    if (body?.placeholder !== undefined) {
      const placeholder = body.placeholder?.trim() || null;
      data.placeholder = placeholder;
      auditData.placeholder = placeholder;
    }

    if (body?.helpText !== undefined) {
      const helpText = body.helpText?.trim() || null;
      data.helpText = helpText;
      auditData.helpText = helpText;
    }

    if (body?.validation !== undefined) {
      data.validation = body.validation;
      auditData.validation = body.validation;
    }

    if (body?.visibility !== undefined) {
      data.visibility = body.visibility;
      auditData.visibility = body.visibility;
    }

    if (body?.externalValidator !== undefined) {
      const externalValidator = body.externalValidator?.trim() || null;
      data.externalValidator = externalValidator;
      auditData.externalValidator = externalValidator;
    }

    if (body?.validatorParams !== undefined) {
      data.validatorParams = body.validatorParams;
      auditData.validatorParams = body.validatorParams;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No field updates provided");
    }

    const field = await prisma.formField.update({
      where: { id: fieldId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_FIELD_UPDATE",
        details: {
          formConfigId: id,
          sectionId,
          fieldId,
          data: auditData,
        },
      },
    });

    return NextResponse.json({ field });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; sectionId: string; fieldId: string }>;
  }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id, sectionId, fieldId } = await params;
    await prisma.formField.delete({
      where: { id: fieldId },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_FIELD_DELETE",
        details: {
          formConfigId: id,
          sectionId,
          fieldId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

