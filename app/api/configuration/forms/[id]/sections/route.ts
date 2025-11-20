import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { parseVisibilityPayload } from "@/lib/forms/visibility-validation";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  const status = message.toLowerCase().includes("unauthorized") ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    const sections = await prisma.formSection.findMany({
      where: { formConfigId: id },
      orderBy: [{ order: "asc" }],
    });
    return NextResponse.json({ sections });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const key = body?.key?.trim();
    const label = body?.label?.trim();
    const order = Number(body?.order ?? 0);

    if (!key) {
      return badRequest("Section key is required");
    }
    if (!label) {
      return badRequest("Section label is required");
    }
    if (Number.isNaN(order)) {
      return badRequest("Section order must be a number");
    }

    const visibilityResult = parseVisibilityPayload(body?.visibility);
    if (!visibilityResult.success) {
      return badRequest(visibilityResult.message);
    }

    const section = await prisma.formSection.create({
      data: {
        formConfigId: id,
        key,
        label,
        order,
        visibility: visibilityResult.provided ? visibilityResult.value : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_SECTION_CREATE",
        applicationId: id,
        details: {
          sectionId: section.id,
          key,
          label,
          order,
          visibility: visibilityResult.provided ? visibilityResult.value : null,
        },
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}


