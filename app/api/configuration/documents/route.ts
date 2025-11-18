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
    const documents = await prisma.documentType.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ documents });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await request.json();
    const key = body?.key?.trim();
    const label = body?.label?.trim();
    const category = body?.category?.trim();
    const description = body?.description?.trim() || null;

    if (!key) {
      return badRequest("Document key is required");
    }
    if (!label) {
      return badRequest("Document label is required");
    }
    if (!category) {
      return badRequest("Document category is required");
    }

    const documentType = await prisma.documentType.create({
      data: {
        key,
        label,
        category,
        description,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_DOC_TYPE_CREATE",
        details: { documentTypeId: documentType.id, key, label, category },
      },
    });

    return NextResponse.json({ documentType }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}


