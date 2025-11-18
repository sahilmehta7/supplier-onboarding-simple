import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  const status = message.toLowerCase().includes("unauthorized") ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    await prisma.formDocumentRequirement.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_DOC_REQUIREMENT_DELETE",
        details: { requirementId: id },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}


