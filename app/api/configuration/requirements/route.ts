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
    const requirements = await prisma.formDocumentRequirement.findMany({
      orderBy: [
        { formConfig: { entity: { name: "asc" } } },
        { formConfig: { geography: { code: "asc" } } },
        { formConfig: { version: "desc" } },
        { documentType: { label: "asc" } },
      ],
      include: {
        formConfig: {
          include: {
            entity: true,
            geography: true,
          },
        },
        documentType: true,
      },
    });
    return NextResponse.json({ requirements });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await request.json();
    const formConfigId = body?.formConfigId?.trim();
    const documentTypeId = body?.documentTypeId?.trim();
    const required =
      body?.required === undefined ? true : Boolean(body.required);
    const helpText = body?.helpText?.trim() || null;

    if (!formConfigId) {
      return badRequest("formConfigId is required");
    }
    if (!documentTypeId) {
      return badRequest("documentTypeId is required");
    }

    const requirement = await prisma.formDocumentRequirement.upsert({
      where: {
        formConfigId_documentTypeId: {
          formConfigId,
          documentTypeId,
        },
      },
      update: {
        required,
        helpText,
      },
      create: {
        formConfigId,
        documentTypeId,
        required,
        helpText,
      },
      include: {
        formConfig: {
          include: { entity: true, geography: true },
        },
        documentType: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_DOC_REQUIREMENT_SET",
        details: {
          requirementId: requirement.id,
          formConfigId,
          documentTypeId,
          required,
        },
      },
    });

    return NextResponse.json({ requirement }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}


