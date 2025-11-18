import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  const status = message.toLowerCase().includes("unauthorized") ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const data: {
      key?: string;
      label?: string;
      category?: string;
      description?: string | null;
    } = {};

    if (body?.key !== undefined) {
      const value = body.key.trim();
      if (!value) {
        return badRequest("Document key cannot be empty");
      }
      data.key = value;
    }

    if (body?.label !== undefined) {
      const value = body.label.trim();
      if (!value) {
        return badRequest("Document label cannot be empty");
      }
      data.label = value;
    }

    if (body?.category !== undefined) {
      const value = body.category.trim();
      if (!value) {
        return badRequest("Document category cannot be empty");
      }
      data.category = value;
    }

    if (body?.description !== undefined) {
      const value = body.description?.trim();
      data.description = value ? value : null;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No document fields provided");
    }

    const documentType = await prisma.documentType.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_DOC_TYPE_UPDATE",
        details: { documentTypeId: documentType.id, data },
      },
    });

    return NextResponse.json({ documentType });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    await prisma.documentType.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_DOC_TYPE_DELETE",
        details: { documentTypeId: id },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}


