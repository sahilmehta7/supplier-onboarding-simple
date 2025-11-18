import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  const status = message.toLowerCase().includes("unauthorized") ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const forms = await prisma.formConfig.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        entity: true,
        geography: true,
        sections: {
          orderBy: [{ order: "asc" }],
        },
        documentRules: {
          include: {
            documentType: true,
          },
        },
      },
    });
    return NextResponse.json({ forms });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await request.json();
    const entityId = body?.entityId?.trim();
    const geographyId = body?.geographyId?.trim();
    const version = Number(body?.version ?? 1);

    if (!entityId) {
      return badRequest("entityId is required");
    }
    if (!geographyId) {
      return badRequest("geographyId is required");
    }
    if (Number.isNaN(version) || version < 1) {
      return badRequest("version must be a positive number");
    }

    const formConfig = await prisma.formConfig.create({
      data: {
        entityId,
        geographyId,
        version,
        title: body?.title?.trim() || null,
        description: body?.description?.trim() || null,
        isActive:
          body?.isActive === undefined ? true : Boolean(body.isActive),
      },
      include: {
        entity: true,
        geography: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_FORM_CONFIG_CREATE",
        details: {
          formConfigId: formConfig.id,
          entityId,
          geographyId,
          version,
        },
      },
    });

    return NextResponse.json({ formConfig }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}


