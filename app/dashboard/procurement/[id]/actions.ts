"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { canTransition } from "@/lib/application-state";

interface CommentInput {
  applicationId: string;
  body: string;
  visibility: "supplier_visible" | "internal_only";
  markPending?: boolean;
}

export async function addCommentAction(input: CommentInput) {
  const { applicationId, body, visibility, markPending } = input;

  if (!body.trim()) {
    throw new Error("Comment body cannot be empty.");
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireRole(["ADMIN", "PROCUREMENT"]);

  await prisma.applicationComment.create({
    data: {
      applicationId,
      authorId: session.user.id,
      body,
      visibility,
    },
  });

  if (markPending && visibility === "supplier_visible") {
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "PENDING_SUPPLIER",
      },
    });
    console.info(
      `[Clarification] Application ${applicationId} flagged for supplier response.`
    );
  }

  await prisma.auditLog.create({
    data: {
      applicationId,
      actorId: session.user.id,
      actorRole: "PROCUREMENT",
      action: visibility === "supplier_visible" ? "COMMENT_SUPPLIER" : "COMMENT_INTERNAL",
      details: {
        note: body.slice(0, 280),
      },
    },
  });

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  return { ok: true };
}

interface TransitionInput {
  applicationId: string;
  targetStatus: "IN_REVIEW" | "PENDING_SUPPLIER" | "APPROVED" | "REJECTED";
  note?: string;
}

export async function transitionApplicationAction(input: TransitionInput) {
  const { applicationId, targetStatus, note } = input;
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireRole(["ADMIN", "PROCUREMENT"]);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { status: true },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  if (!canTransition(application.status, targetStatus)) {
    throw new Error("Invalid state transition");
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: targetStatus,
      updatedById: session.user.id,
      auditLogs: {
        create: {
          actorId: session.user.id,
          actorRole: "PROCUREMENT",
          action: `STATUS_${targetStatus}`,
          details: {
            note: note ?? "",
          },
        },
      },
    },
  });

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  console.info(
    `[Transition] Application ${applicationId} -> ${targetStatus} by ${session.user.id}`
  );
  return { ok: true };
}

export async function claimApplicationAction(applicationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  await requireRole(["ADMIN", "PROCUREMENT"]);

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      updatedById: session.user.id,
    },
  });

  revalidatePath(`/dashboard/procurement/${applicationId}`);
  return { ok: true };
}

