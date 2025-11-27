import type { OCRFieldSchema } from "./openai-vision";

/**
 * Document type to field schema mapping
 * Maps each document type to the fields that can be extracted from it
 */

// GST Certificate Schema
const gstCertificateSchema: OCRFieldSchema = {
    type: "object",
    properties: {
        gst_number: {
            type: "string",
            description:
                "15 character GST number in format like 27AAAAA0000A1Z5. Extract all alphanumeric characters.",
        },
        gst_expiry_date: {
            type: "string",
            description:
                "GST certificate expiry or validity date in YYYY-MM-DD format if mentioned",
        },
        gst_tax_payer_type: {
            type: "string",
            description:
                "Type of tax payer: Regular, Composite, or Provisional as mentioned in the certificate",
        },
    },
    required: ["gst_number"],
};

// PAN Card Schema
const panCardSchema: OCRFieldSchema = {
    type: "object",
    properties: {
        pan_number: {
            type: "string",
            description:
                "10 character PAN number in format like AAAPL1234C. Extract all alphanumeric characters.",
        },
        date_of_incorporation: {
            type: "string",
            description:
                "Date of incorporation or birth date shown on PAN card in YYYY-MM-DD format",
        },
    },
    required: ["pan_number"],
};

// Cancelled Cheque Schema
const cancelledChequeSchema: OCRFieldSchema = {
    type: "object",
    properties: {
        bank_account_number: {
            type: "string",
            description:
                "Bank account number printed on the cheque, typically 9-18 digits",
        },
        ifsc_code: {
            type: "string",
            description:
                "11 character IFSC code in format like SBIN0001234, usually found at bottom or top of cheque",
        },
        bank_name: {
            type: "string",
            description: "Name of the bank printed on the cheque",
        },
        bank_branch: {
            type: "string",
            description: "Branch name or address if visible on the cheque",
        },
        payer_name: {
            type: "string",
            description: "Account holder name printed on the cheque",
        },
    },
    required: ["bank_account_number", "ifsc_code"],
};

// Document type to schema mapping
export const DOCUMENT_SCHEMAS: Record<string, OCRFieldSchema | null> = {
    // Tax documents
    gst_certificate: gstCertificateSchema,
    pan_card: panCardSchema,

    // Banking documents
    cancelled_cheque: cancelledChequeSchema,

    // Documents without OCR extraction (images, marketing materials, etc.)
    anti_bribery_declaration: null, // Signed declaration, no fields to extract
    international_onboarding_pack: null,
    itr_two_year: null, // Complex financial document
    bank_statement_six_month: null, // Complex financial document
    factory_photos_indoor: null, // Just images
    factory_photos_outdoor: null, // Just images
    supplier_brochure: null, // Marketing material
    awards_appreciations: null, // Certificates/letters
};

/**
 * Get OCR schema for a document type
 * @param documentTypeKey - The document type key
 * @returns OCR field schema or null if document type doesn't support OCR
 */
export function getDocumentSchema(
    documentTypeKey: string
): OCRFieldSchema | null {
    return DOCUMENT_SCHEMAS[documentTypeKey] ?? null;
}

/**
 * Check if a document type supports OCR extraction
 * @param documentTypeKey - The document type key
 * @returns True if OCR is supported for this document type
 */
export function supportsOCR(documentTypeKey: string): boolean {
    return DOCUMENT_SCHEMAS[documentTypeKey] !== null;
}

/**
 * Get all document types that support OCR
 * @returns Array of document type keys that support OCR
 */
export function getOCRSupportedDocumentTypes(): string[] {
    return Object.entries(DOCUMENT_SCHEMAS)
        .filter(([, schema]) => schema !== null)
        .map(([key]) => key);
}
