import OpenAI from "openai";
import { OCR_CONFIG, validateOCRConfig } from "./config";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * OpenAI Vision extraction result
 */
export interface OCRExtractionResult {
    success: boolean;
    data: Record<string, unknown>;
    error?: string;
}

/**
 * JSON schema for OpenAI structured output
 */
export interface OCRFieldSchema {
    type: "object";
    properties: Record<
        string,
        {
            type: "string" | "number" | "boolean" | "array";
            description: string;
        }
    >;
    required: string[];
    [key: string]: unknown; // Index signature for OpenAI API compatibility
}

/**
 * Extracts structured data from a document using OpenAI Vision API
 * @param documentBuffer - The document file buffer
 * @param fieldSchema - JSON schema defining fields to extract
 * @param documentType - Type of document being processed (for logging)
 * @returns Extracted field data
 */
export async function extractDataFromDocument(
    documentBuffer: Buffer,
    fieldSchema: OCRFieldSchema,
    documentType: string
): Promise<OCRExtractionResult> {
    try {
        // Validate configuration
        validateOCRConfig();

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: OCR_CONFIG.apiKey,
        });

        // Detect MIME type
        let mimeType = detectMimeType(documentBuffer);
        let base64Image = "";

        // Handle PDF files by converting to image
        if (mimeType === "application/pdf") {
            console.log(`[OCR] Converting PDF to image for processing...`);
            try {
                // Convert first page of PDF to image
                const imageBuffer = await convertPdfToImage(documentBuffer);
                base64Image = imageBuffer.toString("base64");
                mimeType = "image/png";
            } catch (convError) {
                console.error("[OCR] PDF conversion failed:", convError);
                return {
                    success: false,
                    data: {},
                    error: "Failed to convert PDF document to image for OCR processing.",
                };
            }
        } else {
            // Normal image processing
            base64Image = documentBuffer.toString("base64");
        }

        // Check if MIME type is supported by OpenAI Vision
        const supportedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!supportedMimeTypes.includes(mimeType)) {
            console.log(`[OCR] Skipping OCR for unsupported MIME type: ${mimeType}`);
            return {
                success: false,
                data: {},
                error: "OCR is only supported for image files (JPG, PNG) and PDFs.",
            };
        }

        console.log(
            `[OCR] Processing ${documentType} with model ${OCR_CONFIG.model}`
        );

        // Call OpenAI Vision API with structured output
        const response = await openai.chat.completions.create({
            model: OCR_CONFIG.model,
            messages: [
                {
                    role: "system",
                    content: `You are a document data extraction assistant. Extract the requested fields from the provided document image accurately. 
Return only the structured data as specified. If a field cannot be found or read, use null for that field.`,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Extract the following fields from this ${documentType} document:\n${JSON.stringify(fieldSchema.properties, null, 2)}`,
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "document_extraction",
                    strict: true,
                    schema: fieldSchema,
                },
            },
            temperature: 0.1, // Low temperature for consistent extraction
            max_tokens: 1000,
        });

        // Parse the response
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No content in OpenAI response");
        }

        const extractedData = JSON.parse(content);

        console.log(
            `[OCR] Successfully extracted data from ${documentType}:`,
            Object.keys(extractedData)
        );

        return {
            success: true,
            data: extractedData,
        };
    } catch (error) {
        console.error(`[OCR] Error extracting data from ${documentType}:`, error);

        return {
            success: false,
            data: {},
            error:
                error instanceof Error ? error.message : "Unknown extraction error",
        };
    }
}

/**
 * Detects MIME type from buffer
 */
function detectMimeType(buffer: Buffer): string {
    // Check magic numbers for common document types
    const header = buffer.toString("hex", 0, 4);

    if (header === "25504446") return "application/pdf";
    if (header.startsWith("ffd8ff")) return "image/jpeg";
    if (header === "89504e47") return "image/png";
    if (header.startsWith("47494638")) return "image/gif";

    // Default to PDF as most documents are PDFs
    return "application/pdf";
}

/**
 * Converts the first page of a PDF buffer to a PNG image buffer using pdfjs-dist and @napi-rs/canvas
 */
async function convertPdfToImage(pdfBuffer: Buffer): Promise<Buffer> {
    // Determine the path to the standard font files for pdfjs
    // In a serverless/node environment, this might need adjustment if fonts are needed.
    // For basic rendering to image, standard fonts might be sufficient or we might need to configure this.

    // Load the document using Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        verbosity: 0,
        standardFontDataUrl: `node_modules/pdfjs-dist/standard_fonts/`, // attempt to point to standard fonts if needed
    });

    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);

    // Set scale for quality (e.g., 2.0 for higher res)
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    // Create a canvas with the viewport dimensions
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    // Render the page structure into the canvas
    const renderContext = {
        canvasContext: context as any, // Cast to any to satisfy pdfjs types vs napi-rs types mismatch
        viewport: viewport,
    };

    await page.render(renderContext as any).promise;

    // Export to PNG buffer
    return canvas.toBuffer("image/png");
}

