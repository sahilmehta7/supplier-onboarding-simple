import { z } from "zod";

export const supplierWizardSchema = z.object({
  supplierInformation: z.object({
    supplierName: z.string().min(1, "Supplier name is required"),
    paymentTerms: z.enum(["Net 30", "Net 45", "Net 60"]),
    salesContactName: z.string().min(1, "Sales contact name is required"),
    salesContactEmail: z
      .string()
      .email("Provide a valid contact email")
      .optional()
      .or(z.literal("")),
  }),
  addresses: z.object({
    remitToAddress: z.object({
      line1: z.string().min(1, "Address line 1 is required"),
      city: z.string().min(1, "City is required"),
      country: z.string().min(1, "Country is required"),
    }),
    orderingAddressSameAsRemit: z.boolean().default(true),
  }),
  bankInformation: z.object({
    bankName: z.string().min(1, "Bank name is required"),
    routingNumber: z
      .string()
      .regex(/^[0-9]{9}$/, "Routing number must be 9 digits"),
    accountNumber: z.string().min(4, "Account number is required"),
  }),
  documents: z.array(
    z.object({
      type: z.string(),
      fileId: z.string(),
      fileName: z.string(),
      mimeType: z.string().optional(),
    })
  ),
});

export type SupplierWizardData = z.infer<typeof supplierWizardSchema>;

