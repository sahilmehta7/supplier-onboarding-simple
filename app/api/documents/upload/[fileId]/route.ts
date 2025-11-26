import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveFile } from "@/lib/storage";
import { requireApplicationAccess } from "@/lib/permissions";

export async function POST(
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
    // Extract applicationId from request body or headers
    const applicationId = request.headers.get("x-application-id");

    if (!applicationId) {
      return NextResponse.json(
        { error: "Missing application ID" },
        { status: 400 }
      );
    }

    // Validate user has access to this application
    await requireApplicationAccess(applicationId, session.user.id);

    // Read the file from the request body
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to local storage
    await saveFile(fileId, buffer);

    return NextResponse.json({ success: true, fileId });
  } catch (error) {
    console.error("File upload error:", error);

    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to save file" },
      { status: 500 }
    );
  }
}

