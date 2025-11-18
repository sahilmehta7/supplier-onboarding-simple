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
    const entities = await prisma.entity.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ entities });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await request.json();
    const name = body?.name?.trim();
    const code = body?.code?.trim();
    const description = body?.description?.trim() || null;

    if (!name) {
      return badRequest("Entity name is required");
    }
    if (!code) {
      return badRequest("Entity code is required");
    }

    const entity = await prisma.entity.create({
      data: {
        name,
        code,
        description,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_ENTITY_CREATE",
        details: { entityId: entity.id, name, code },
      },
    });

    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}


