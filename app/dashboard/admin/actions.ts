"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/permissions";
import { MembershipRole } from "@prisma/client";

async function recordAuditLog(
  actorId: string,
  actorRole: MembershipRole,
  action: string,
  organizationId?: string,
  applicationId?: string,
  details?: object
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole,
      organizationId,
      applicationId,
      action,
      details: details ? (details as object) : undefined,
    },
  });
}

export async function updateIntegrationsAction(formData: FormData) {
  const session = await requireAuth();
  const organizationId = formData.get("integration-org") as string;
  
  if (!organizationId) {
    throw new Error("Organization ID is required");
  }

  await requireAdmin(organizationId);

  const freshdeskDomain = formData.get("freshdesk-domain") as string;
  const freshdeskApiKey = formData.get("freshdesk-api-key") as string;
  const emailTemplate = formData.get("email-template") as string;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      freshdeskDomain: freshdeskDomain?.trim() || null,
      freshdeskApiKey: freshdeskApiKey?.trim() || null,
      emailTemplate: emailTemplate?.trim() || null,
    },
  });

  const userRole = session.user.organizationRoles.find(
    (r) => r.organizationId === organizationId
  )?.role as MembershipRole;

  await recordAuditLog(
    session.user.id,
    userRole,
    "SETTINGS_INTEGRATIONS_UPDATE",
    organizationId,
    undefined,
    { freshdeskDomain: freshdeskDomain ? "***" : null, emailTemplate: emailTemplate ? "***" : null }
  );

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/admin");
}

