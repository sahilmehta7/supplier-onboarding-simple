import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { parseVisibilityPayload } from "@/lib/forms/visibility-validation";

function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  const status = message.toLowerCase().includes("unauthorized") ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

type SectionUpdateData = {
  key?: string;
  label?: string;
  order?: number;
  visibility?: Prisma.JsonValue | null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id, sectionId } = await params;
    const body = await request.json();
    const data: SectionUpdateData = {};

    if (body?.key !== undefined) {
      const value = body.key.trim();
      if (!value) {
        return badRequest("Section key cannot be empty");
      }
      data.key = value;
    }

    if (body?.label !== undefined) {
      const value = body.label.trim();
      if (!value) {
        return badRequest("Section label cannot be empty");
      }
      data.label = value;
    }

    if (body?.order !== undefined) {
      const order = Number(body.order);
      if (Number.isNaN(order)) {
        return badRequest("Section order must be numeric");
      }
      data.order = order;
    }

    const visibilityResult = parseVisibilityPayload(body?.visibility);
    if (!visibilityResult.success) {
      return badRequest(visibilityResult.message);
    }

    if (visibilityResult.provided) {
      data.visibility = visibilityResult.value;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No section fields provided");
    }

    const section = await prisma.formSection.update({
      where: { id: sectionId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_SECTION_UPDATE",
        details: {
          formConfigId: id,
          sectionId: section.id,
          data,
        },
      },
    });

    return NextResponse.json({ section });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id, sectionId } = await params;
    await prisma.formSection.delete({
      where: { id: sectionId },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_SECTION_DELETE",
        details: { formConfigId: id, sectionId },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}


