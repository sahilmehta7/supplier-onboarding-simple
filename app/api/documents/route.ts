import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { applicationId, documentTypeKey, fileId, fileName, mimeType, fileSize } = body;

  if (!applicationId || !fileId || !documentTypeKey || !fileName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organization: {
        members: { some: { userId: session.user.id } },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const documentType = await prisma.documentType.findUnique({
    where: { key: documentTypeKey },
  });

  if (!documentType) {
    return NextResponse.json({ error: "Unknown document type" }, { status: 400 });
  }

  await prisma.applicationDocument.create({
    data: {
      applicationId,
      documentTypeId: documentType.id,
      fileName,
      fileUrl: fileId,
      mimeType,
      fileSize,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}

