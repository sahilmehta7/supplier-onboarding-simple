import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFileId } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { applicationId, fileName, mimeType, fileSize } = body;

  if (!applicationId || !fileName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organization: {
        members: {
          some: { userId: session.user.id },
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const fileId = generateFileId(fileName);

  // Return the upload endpoint URL (client will POST to this)
  return NextResponse.json({
    uploadUrl: `/api/documents/upload/${fileId}`,
    fileId,
    fileName,
    mimeType,
    fileSize,
  });
}

