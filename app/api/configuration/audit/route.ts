import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  const status = message.toLowerCase().includes("unauthorized") ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const logs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            "ADMIN_ENTITY_CREATE",
            "ADMIN_ENTITY_UPDATE",
            "ADMIN_ENTITY_DELETE",
            "ADMIN_GEO_CREATE",
            "ADMIN_GEO_UPDATE",
            "ADMIN_GEO_DELETE",
            "ADMIN_FORM_CONFIG_CREATE",
            "ADMIN_FORM_CONFIG_UPDATE",
            "ADMIN_FORM_CONFIG_DELETE",
            "ADMIN_SECTION_CREATE",
            "ADMIN_SECTION_UPDATE",
            "ADMIN_SECTION_DELETE",
            "ADMIN_DOC_TYPE_CREATE",
            "ADMIN_DOC_TYPE_UPDATE",
            "ADMIN_DOC_TYPE_DELETE",
            "ADMIN_DOC_REQUIREMENT_SET",
            "ADMIN_DOC_REQUIREMENT_DELETE",
            "ADMIN_INTEGRATIONS_UPDATE",
            "SETTINGS_INTEGRATIONS_UPDATE",
          ],
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 50,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return handleError(error);
  }
}


