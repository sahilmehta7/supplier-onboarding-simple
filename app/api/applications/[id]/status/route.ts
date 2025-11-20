import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const application = await prisma.application.findFirst({
    where: {
      id,
      OR: [
        {
          organization: {
            members: {
              some: { userId: session.user.id },
            },
          },
        },
        // Also allow internal team members
        {
          organization: {
            members: {
              some: {
                userId: session.user.id,
                role: { in: ["ADMIN", "PROCUREMENT", "MEMBER"] },
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      status: true,
      version: true,
      updatedAt: true,
    },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: application.status,
    version: application.version,
    updatedAt: application.updatedAt.toISOString(),
  });
}

