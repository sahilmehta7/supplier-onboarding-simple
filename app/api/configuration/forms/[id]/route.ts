import { Prisma } from "@prisma/client";
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
    const updateData: Prisma.FormConfigUncheckedUpdateInput = {};
    const auditData: Prisma.JsonObject = {};

    if (body?.entityId !== undefined) {
      const value = body.entityId.trim();
      if (!value) {
        return badRequest("entityId cannot be empty");
      }
      updateData.entityId = value;
      auditData.entityId = value;
    }

    if (body?.geographyId !== undefined) {
      const value = body.geographyId.trim();
      if (!value) {
        return badRequest("geographyId cannot be empty");
      }
      updateData.geographyId = value;
      auditData.geographyId = value;
    }

    if (body?.version !== undefined) {
      const version = Number(body.version);
      if (Number.isNaN(version) || version < 1) {
        return badRequest("version must be a positive number");
      }
      updateData.version = version;
      auditData.version = version;
    }

    if (body?.title !== undefined) {
      const title = body.title?.trim() || null;
      updateData.title = title;
      auditData.title = title;
    }

    if (body?.description !== undefined) {
      const description = body.description?.trim() || null;
      updateData.description = description;
      auditData.description = description;
    }

    if (body?.isActive !== undefined) {
      const isActive = Boolean(body.isActive);
      updateData.isActive = isActive;
      auditData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return badRequest("No form config fields provided");
    }

    const formConfig = await prisma.formConfig.update({
      where: { id },
      data: updateData,
      include: {
        entity: true,
        geography: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_FORM_CONFIG_UPDATE",
        details: { formConfigId: id, data: auditData },
      },
    });

    return NextResponse.json({ formConfig });
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

    await prisma.formConfig.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_FORM_CONFIG_DELETE",
        details: { formConfigId: id },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}


