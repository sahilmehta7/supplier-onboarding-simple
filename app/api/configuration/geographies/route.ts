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
    const geographies = await prisma.geography.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ geographies });
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

    if (!name) {
      return badRequest("Geography name is required");
    }
    if (!code) {
      return badRequest("Geography code is required");
    }

    const geography = await prisma.geography.create({
      data: {
        name,
        code,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_GEO_CREATE",
        details: { geographyId: geography.id, name, code },
      },
    });

    return NextResponse.json({ geography }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}


