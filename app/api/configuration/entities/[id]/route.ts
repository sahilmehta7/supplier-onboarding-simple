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
      name?: string;
      code?: string;
      description?: string | null;
    } = {};

    if (body?.name !== undefined) {
      const value = body.name.trim();
      if (!value) {
        return badRequest("Entity name cannot be empty");
      }
      data.name = value;
    }

    if (body?.code !== undefined) {
      const value = body.code.trim();
      if (!value) {
        return badRequest("Entity code cannot be empty");
      }
      data.code = value;
    }

    if (body?.description !== undefined) {
      const value = body.description?.trim();
      data.description = value ? value : null;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No entity fields provided");
    }

    const entity = await prisma.entity.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_ENTITY_UPDATE",
        details: { entityId: entity.id, data },
      },
    });

    return NextResponse.json({ entity });
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

    await prisma.entity.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_ENTITY_DELETE",
        details: { entityId: id },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}


