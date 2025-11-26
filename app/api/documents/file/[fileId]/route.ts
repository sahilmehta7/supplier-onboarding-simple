import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFileFromStorage, fileExists } from "@/lib/storage";
import { requireDocumentAccess } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  if (!fileId) {
    return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
  }

  try {
    // Validate user has access to this document
    await requireDocumentAccess(fileId, session.user.id);

    // Get document details
    const document = await prisma.applicationDocument.findFirst({
      where: { fileUrl: fileId },
      select: {
        fileName: true,
        mimeType: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if file exists in storage
    const exists = await fileExists(fileId);
    if (!exists) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }

    // Read and return the file
    const fileBuffer = await readFileFromStorage(fileId);
    const mimeType = document.mimeType || "application/octet-stream";

    return new NextResponse(fileBuffer as any, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${document.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("File retrieval error:", error);

    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to retrieve file" },
      { status: 500 }
    );
  }
}

