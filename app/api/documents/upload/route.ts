import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveFile, generateFileId } from "@/lib/storage";

/**
 * POST /api/documents/upload
 * Handles file upload with FormData
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse FormData
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const applicationId = formData.get("applicationId") as string | null;
        const documentTypeKey = formData.get("documentTypeKey") as string | null;

        if (!file || !applicationId || !documentTypeKey) {
            return NextResponse.json(
                { error: "Missing required fields: file, applicationId, documentTypeKey" },
                { status: 400 }
            );
        }

        // Validate file size (10MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
                { status: 400 }
            );
        }

        // Verify user has access to application
        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                organization: {
                    members: {
                        some: {
                            userId: session.user.id,
                        },
                    },
                },
            },
        });

        if (!application) {
            return NextResponse.json(
                { error: "Application not found or access denied" },
                { status: 404 }
            );
        }

        // Verify document type exists
        const documentType = await prisma.documentType.findUnique({
            where: { key: documentTypeKey },
        });

        if (!documentType) {
            return NextResponse.json(
                { error: "Invalid document type" },
                { status: 400 }
            );
        }

        // Generate unique file ID and save to storage
        const fileId = generateFileId(file.name);
        const buffer = Buffer.from(await file.arrayBuffer());

        await saveFile(fileId, buffer);

        // Create document record
        const document = await prisma.applicationDocument.create({
            data: {
                applicationId,
                documentTypeId: documentType.id,
                fileName: file.name,
                fileUrl: fileId,
                mimeType: file.type,
                fileSize: file.size,
                uploadedById: session.user.id,
            },
        });

        console.log(
            `[Upload] Document uploaded: ${document.id} (${file.name}) for application ${applicationId}`
        );

        return NextResponse.json({
            success: true,
            documentId: document.id,
            fileName: file.name,
            fileSize: file.size,
        });
    } catch (error) {
        console.error("[Upload] Error:", error);
        return NextResponse.json(
            {
                error: "Upload failed",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
