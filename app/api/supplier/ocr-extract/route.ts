import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFileFromStorage } from "@/lib/storage";
import { extractDataFromDocument } from "@/lib/ocr/openai-vision";
import { getDocumentSchema, supportsOCR } from "@/lib/ocr/document-schemas";
import { isOCRAvailable } from "@/lib/ocr/config";

/**
 * POST /api/supplier/ocr-extract
 * Extracts data from an uploaded document using OCR
 */
export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if OCR is available
        if (!isOCRAvailable()) {
            return NextResponse.json(
                {
                    error: "OCR is not configured",
                    success: false,
                    data: {},
                },
                { status: 200 } // Return 200 to allow graceful degradation
            );
        }

        // Parse request body
        const body = await request.json();
        const { documentId } = body;

        if (!documentId || typeof documentId !== "string") {
            return NextResponse.json(
                { error: "Invalid document ID" },
                { status: 400 }
            );
        }

        // Fetch the document with authorization check
        const document = await prisma.applicationDocument.findFirst({
            where: {
                id: documentId,
            },
            include: {
                application: {
                    include: {
                        organization: {
                            include: {
                                members: {
                                    where: {
                                        userId: session.user.id,
                                    },
                                },
                            },
                        },
                    },
                },
                documentType: true,
            },
        });

        if (!document) {
            return NextResponse.json(
                { error: "Document not found" },
                { status: 404 }
            );
        }

        // Check if user has access to this document's application
        if (document.application.organization.members.length === 0) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check if this document type supports OCR
        const documentTypeKey = document.documentType.key;
        if (!supportsOCR(documentTypeKey)) {
            return NextResponse.json({
                success: false,
                data: {},
                message: `OCR not supported for document type: ${documentTypeKey}`,
            });
        }

        // Get the field schema for this document type
        const fieldSchema = getDocumentSchema(documentTypeKey);
        if (!fieldSchema) {
            return NextResponse.json({
                success: false,
                data: {},
                message: "No schema available for this document type",
            });
        }

        // Update status to processing
        await prisma.applicationDocument.update({
            where: { id: documentId },
            data: {
                ocrStatus: "processing" as any,
            },
        });

        try {
            // Read the file from storage
            const fileBuffer = await readFileFromStorage(document.fileUrl);

            // Extract data using OpenAI Vision
            const extractionResult = await extractDataFromDocument(
                fileBuffer,
                fieldSchema,
                documentTypeKey
            );

            if (extractionResult.success) {
                // Update document with extracted data
                await prisma.applicationDocument.update({
                    where: { id: documentId },
                    data: {
                        ocrStatus: "completed" as any,
                        ocrExtractedData: extractionResult.data as any,
                        ocrProcessedAt: new Date(),
                        ocrError: null,
                    },
                });

                // Merge extracted data into application data using _ocr namespace
                // This prevents overwriting user manual edits
                const currentData =
                    (document.application.data as Record<string, unknown>) || {};

                // Store OCR data in separate namespace
                const currentOcrData = (currentData._ocr as Record<string, unknown>) || {};
                const updatedData: Record<string, unknown> = {
                    ...currentData,
                    _ocr: {
                        ...currentOcrData,
                        [documentTypeKey]: extractionResult.data,
                    },
                };

                // Also populate root-level fields ONLY if they don't exist yet
                // This allows OCR to pre-fill but user edits take precedence
                Object.keys(extractionResult.data).forEach((key) => {
                    if (currentData[key] === undefined || currentData[key] === null || currentData[key] === "") {
                        updatedData[key] = extractionResult.data[key];
                    }
                    // If field already has a value, keep it (user edited or previous OCR)
                });

                // Update application with merged data and track OCR processing
                const currentOcrProcessed =
                    (document.application.ocrProcessed as Record<string, boolean>) || {};
                await prisma.application.update({
                    where: { id: document.application.id },
                    data: {
                        data: updatedData as any, // Cast to any for Prisma JSON type
                        ocrProcessed: {
                            ...currentOcrProcessed,
                            [documentTypeKey]: true,
                        } as any, // Cast to any for Prisma JSON type
                    },
                });

                console.log(
                    `[OCR] Successfully processed document ${documentId} of type ${documentTypeKey}`
                );

                return NextResponse.json({
                    success: true,
                    data: extractionResult.data,
                });
            } else {
                // OCR failed - update status but don't throw error
                await prisma.applicationDocument.update({
                    where: { id: documentId },
                    data: {
                        ocrStatus: "failed" as any,
                        ocrError: extractionResult.error || "Extraction failed",
                        ocrProcessedAt: new Date(),
                    },
                });

                console.warn(
                    `[OCR] Failed to process document ${documentId}:`,
                    extractionResult.error
                );

                return NextResponse.json({
                    success: false,
                    data: {},
                    error: extractionResult.error,
                });
            }
        } catch (extractError) {
            // Handle extraction errors
            await prisma.applicationDocument.update({
                where: { id: documentId },
                data: {
                    ocrStatus: "failed" as any,
                    ocrError:
                        extractError instanceof Error
                            ? extractError.message
                            : "Unknown error",
                    ocrProcessedAt: new Date(),
                },
            });

            console.error(
                `[OCR] Error during extraction for document ${documentId}:`,
                extractError
            );

            return NextResponse.json({
                success: false,
                data: {},
                error:
                    extractError instanceof Error
                        ? extractError.message
                        : "Extraction error",
            });
        }
    } catch (error) {
        console.error("[OCR] API error:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                success: false,
                data: {},
            },
            { status: 500 }
        );
    }
}
