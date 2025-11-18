import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const ENTITY_CODE = "ZET";
const GEOGRAPHY_CODE = "IN";
const FORM_VERSION = 1;

const YES_NO = ["Yes", "No"] as const;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

interface FieldSeed {
  key: string;
  label: string;
  type: string;
  order: number;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Prisma.JsonValue;
  validation?: Prisma.JsonValue;
  visibility?: Prisma.JsonValue;
  isSensitive?: boolean;
}

interface SectionSeed {
  key: string;
  label: string;
  order: number;
  fields: FieldSeed[];
}

const sections: SectionSeed[] = [
  {
    key: "basic_supplier_information",
    label: "Basic Supplier Information",
    order: 1,
    fields: [
      {
        key: "supplier_company_name",
        label: "Supplier Company Name",
        type: "text",
        order: 1,
        required: true,
        placeholder: "Registered legal name",
      },
      {
        key: "type_of_supplier_firm",
        label: "Type of Supplier Firm",
        type: "select",
        order: 2,
        required: true,
        options: {
          values: [
            "Proprietorship",
            "Partnership",
            "Private Limited",
            "Public Limited",
            "LLP",
            "Trust",
            "Society",
            "Other",
          ],
        },
      },
      {
        key: "nature_of_assessee",
        label: "Nature of Assessee",
        type: "select",
        order: 3,
        required: true,
        options: {
          values: ["Company", "Firm", "Individual", "LLP", "Trust", "Other"],
        },
      },
      {
        key: "year_of_establishment",
        label: "Year of Establishment",
        type: "number",
        order: 4,
        required: true,
        placeholder: "e.g. 2011",
        validation: {
          regex: "^(19|20)\\d{2}$",
          message: "Enter a four digit year",
        },
      },
      {
        key: "msme_registered",
        label: "Is the firm MSME registered?",
        type: "radio",
        order: 5,
        required: true,
        options: {
          values: YES_NO,
        },
      },
      {
        key: "msme_registration_number",
        label: "MSME Registration Number",
        type: "text",
        order: 6,
        placeholder: "Enter Udyam Registration No.",
        visibility: {
          dependsOn: "msme_registered",
          condition: "equals",
          value: "Yes",
        },
      },
      {
        key: "is_intermediary_agency",
        label: "Is this an intermediary agency?",
        type: "radio",
        order: 7,
        required: true,
        options: {
          values: YES_NO,
        },
      },
      {
        key: "intermediary_details",
        label: "Intermediary Agency Details",
        type: "textarea",
        order: 8,
        placeholder: "Share context about intermediary services",
        visibility: {
          dependsOn: "is_intermediary_agency",
          condition: "equals",
          value: "Yes",
        },
      },
    ],
  },
  {
    key: "supplier_primary_poc",
    label: "Supplier Primary POC Details",
    order: 2,
    fields: [
      {
        key: "primary_poc_name",
        label: "Primary POC Name",
        type: "text",
        order: 1,
        required: true,
      },
      {
        key: "primary_poc_email",
        label: "Primary POC Email",
        type: "email",
        order: 2,
        required: true,
      },
      {
        key: "primary_poc_contact_number",
        label: "Primary POC Contact Number",
        type: "tel",
        order: 3,
        required: true,
        validation: {
          regex: "^(\\+?91)?[6-9]\\d{9}$",
          message: "Enter a valid Indian mobile number",
        },
      },
      {
        key: "primary_poc_designation",
        label: "Primary POC Designation",
        type: "text",
        order: 4,
      },
      {
        key: "primary_poc_travels_for_supplier",
        label: "Do you travel for this supplier?",
        type: "radio",
        order: 5,
        options: {
          values: YES_NO,
        },
      },
    ],
  },
  {
    key: "supplier_secondary_poc",
    label: "Supplier Secondary POC Details",
    order: 3,
    fields: [
      {
        key: "secondary_poc_name",
        label: "Secondary POC Name",
        type: "text",
        order: 1,
      },
      {
        key: "secondary_poc_email",
        label: "Secondary POC Email",
        type: "email",
        order: 2,
      },
      {
        key: "secondary_poc_contact_number",
        label: "Secondary POC Contact Number",
        type: "tel",
        order: 3,
        validation: {
          regex: "^(\\+?91)?[6-9]\\d{9}$",
          message: "Enter a valid Indian mobile number",
        },
      },
      {
        key: "secondary_poc_role",
        label: "Secondary POC Role",
        type: "text",
        order: 4,
      },
    ],
  },
  {
    key: "address_information",
    label: "Address",
    order: 4,
    fields: [
      {
        key: "address_name",
        label: "Address Name",
        type: "text",
        order: 1,
        required: true,
      },
      {
        key: "address_line_1",
        label: "Address Line 1",
        type: "text",
        order: 2,
        required: true,
      },
      {
        key: "address_line_2",
        label: "Address Line 2",
        type: "text",
        order: 3,
      },
      {
        key: "address_purpose",
        label: "Address Purpose",
        type: "multi-select",
        order: 4,
        options: {
          values: ["Business", "Billing", "Shipping", "Factory", "Registered Office", "Other"],
        },
        helpText: "Select all applicable purposes",
      },
      {
        key: "country",
        label: "Country",
        type: "select",
        order: 5,
        required: true,
        options: {
          values: ["India"],
        },
      },
      {
        key: "state",
        label: "State",
        type: "select",
        order: 6,
        required: true,
        options: {
          values: INDIAN_STATES,
        },
      },
      {
        key: "city",
        label: "City",
        type: "text",
        order: 7,
        required: true,
      },
      {
        key: "postal_code",
        label: "PIN Code",
        type: "text",
        order: 8,
        required: true,
        validation: {
          regex: "^[1-9][0-9]{5}$",
          message: "Enter a 6 digit Indian PIN code",
        },
      },
      {
        key: "epc_code",
        label: "EPC Code",
        type: "text",
        order: 9,
        helpText: "Optional Export Promotion Council registration",
      },
      {
        key: "is_primary_address",
        label: "Is this the primary address?",
        type: "radio",
        order: 10,
        options: {
          values: YES_NO,
        },
      },
    ],
  },
  {
    key: "zetwerk_internal",
    label: "Zetwerk Internal",
    order: 5,
    fields: [
      {
        key: "act_team_reference",
        label: "ACT Team Engagement",
        type: "select",
        order: 1,
        options: {
          values: ["ACT", "Non-ACT"],
        },
      },
      {
        key: "onboarding_for_company",
        label: "Onboarding for Company?",
        type: "select",
        order: 2,
        required: true,
        options: {
          values: ["Zetwerk", "Unimacts", "Other"],
        },
      },
      {
        key: "zetwerk_poc_name",
        label: "Zetwerk POC",
        type: "text",
        order: 3,
        required: true,
      },
      {
        key: "zetwerk_poc_contact_number",
        label: "Zetwerk POC Contact Number",
        type: "tel",
        order: 4,
        validation: {
          regex: "^\\+?[0-9]{7,15}$",
          message: "Enter a valid phone number with country code",
        },
      },
      {
        key: "zetwerk_poc_email",
        label: "Zetwerk POC Email",
        type: "email",
        order: 5,
      },
    ],
  },
  {
    key: "gst_details",
    label: "GST Certificate",
    order: 6,
    fields: [
      {
        key: "gst_certificate_upload",
        label: "Upload GST Certificate",
        type: "document",
        order: 1,
        required: true,
        helpText: "Upload the latest GST registration certificate (PDF).",
        options: {
          documentTypeKey: "gst_certificate",
        },
      },
      {
        key: "gst_number",
        label: "GST Number",
        type: "text",
        order: 2,
        required: true,
        validation: {
          regex: "^[0-9A-Z]{15}$",
          message: "GST number must be 15 alphanumeric characters",
        },
      },
      {
        key: "gst_expiry_date",
        label: "GST Expiry Date",
        type: "date",
        order: 3,
      },
      {
        key: "gst_tax_payer_type",
        label: "Type of Tax Payer",
        type: "select",
        order: 4,
        required: true,
        options: {
          values: ["Regular", "Composite", "Provisional"],
        },
      },
    ],
  },
  {
    key: "tan_details",
    label: "TAN Details",
    order: 7,
    fields: [
      {
        key: "tan_number",
        label: "TAN Number",
        type: "text",
        order: 1,
        helpText: "Enter the 10 character Tax Deduction Account Number",
        validation: {
          regex: "^[A-Z]{4}[0-9]{5}[A-Z]{1}$",
          message: "TAN should match format AAAA99999A",
        },
      },
    ],
  },
  {
    key: "kyc_documents",
    label: "KYC Documents",
    order: 8,
    fields: [
      {
        key: "anti_bribery_declaration_upload",
        label: "Anti Bribery & Anti Corruption Declaration",
        type: "document",
        order: 1,
        required: true,
        options: {
          documentTypeKey: "anti_bribery_declaration",
        },
        helpText: "Signed self declaration per Zetwerk compliance template.",
      },
    ],
  },
  {
    key: "bank_information",
    label: "Cancelled Cheque & Bank Information",
    order: 9,
    fields: [
      {
        key: "cancelled_cheque_upload",
        label: "Upload Cancelled Cheque",
        type: "document",
        order: 1,
        required: true,
        options: {
          documentTypeKey: "cancelled_cheque",
        },
      },
      {
        key: "payer_name",
        label: "Payer Name",
        type: "text",
        order: 2,
        required: true,
      },
      {
        key: "bank_account_number",
        label: "Bank Account Number",
        type: "text",
        order: 3,
        required: true,
        isSensitive: true,
        validation: {
          regex: "^[0-9]{9,18}$",
          message: "Account number should be 9-18 digits",
        },
      },
      {
        key: "bank_name",
        label: "Bank Name",
        type: "text",
        order: 4,
        required: true,
      },
      {
        key: "bank_branch",
        label: "Bank Branch",
        type: "text",
        order: 5,
      },
      {
        key: "bank_account_type",
        label: "Account Type",
        type: "select",
        order: 6,
        required: true,
        options: {
          values: ["Current", "Savings", "NRE", "NRO", "Other"],
        },
      },
      {
        key: "ifsc_code",
        label: "IFSC Code",
        type: "text",
        order: 7,
        required: true,
        validation: {
          regex: "^[A-Z]{4}0[0-9A-Z]{6}$",
          message: "Enter a valid 11 character IFSC",
        },
      },
      {
        key: "swift_code",
        label: "SWIFT / BIC Code",
        type: "text",
        order: 8,
        validation: {
          regex: "^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$",
          message: "Enter an 8 or 11 character SWIFT/BIC",
        },
      },
      {
        key: "account_currency_code",
        label: "Account Currency Code",
        type: "select",
        order: 9,
        required: true,
        options: {
          values: ["INR", "USD", "EUR", "GBP", "SGD", "Other"],
        },
      },
      {
        key: "remittance_email_address",
        label: "Remittance Email Address",
        type: "email",
        order: 10,
        helpText: "Email for payment advice",
      },
    ],
  },
  {
    key: "pan_details",
    label: "PAN Card",
    order: 10,
    fields: [
      {
        key: "pan_card_upload",
        label: "Upload PAN Card",
        type: "document",
        order: 1,
        required: true,
        options: {
          documentTypeKey: "pan_card",
        },
      },
      {
        key: "pan_number",
        label: "PAN Number",
        type: "text",
        order: 2,
        required: true,
        validation: {
          regex: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$",
          message: "PAN should match format AAAAA9999A",
        },
      },
      {
        key: "date_of_incorporation",
        label: "Date of Incorporation",
        type: "date",
        order: 3,
        required: true,
      },
    ],
  },
  {
    key: "currency_setup",
    label: "Currency Setup",
    order: 11,
    fields: [
      {
        key: "currency_base",
        label: "Currency Base",
        type: "select",
        order: 1,
        required: true,
        options: {
          values: ["INR", "USD", "EUR", "GBP", "SGD", "Other"],
        },
      },
      {
        key: "currency_alternate",
        label: "Currency Alternate ID",
        type: "select",
        order: 2,
        options: {
          values: ["INR", "USD", "EUR", "GBP", "SGD", "Other"],
        },
        helpText: "Select an alternate currency if applicable",
      },
    ],
  },
  {
    key: "international_onboarding",
    label: "Other Documents",
    order: 12,
    fields: [
      {
        key: "international_onboarding_documents",
        label: "International Onboarding Documents",
        type: "document",
        order: 1,
        options: {
          documentTypeKey: "international_onboarding_pack",
        },
        helpText: "Optional pack for international banking/compliance.",
      },
    ],
  },
  {
    key: "financial_statements",
    label: "Financial Statement",
    order: 13,
    fields: [
      {
        key: "itr_two_year_upload",
        label: "2 Year ITR",
        type: "document",
        order: 1,
        required: true,
        options: {
          documentTypeKey: "itr_two_year",
        },
      },
      {
        key: "bank_statement_six_month_upload",
        label: "6 Month Bank Statement",
        type: "document",
        order: 2,
        required: true,
        options: {
          documentTypeKey: "bank_statement_six_month",
        },
      },
    ],
  },
  {
    key: "attachments",
    label: "Attachments",
    order: 14,
    fields: [
      {
        key: "factory_photos_indoor_upload",
        label: "Factory / Facility Pictures (Indoor)",
        type: "document",
        order: 1,
        options: {
          documentTypeKey: "factory_photos_indoor",
        },
      },
      {
        key: "factory_photos_outdoor_upload",
        label: "Factory / Facility Pictures (Outdoor)",
        type: "document",
        order: 2,
        options: {
          documentTypeKey: "factory_photos_outdoor",
        },
      },
      {
        key: "supplier_brochure_upload",
        label: "Supplier Brochure",
        type: "document",
        order: 3,
        options: {
          documentTypeKey: "supplier_brochure",
        },
      },
      {
        key: "awards_appreciations_upload",
        label: "Rewards / Appreciations from Customers",
        type: "document",
        order: 4,
        options: {
          documentTypeKey: "awards_appreciations",
        },
      },
    ],
  },
];

const documentTypesData = [
  {
    key: "anti_bribery_declaration",
    label: "Anti Bribery & Anti Corruption Declaration",
    category: "kyc",
    description: "Signed ABC declaration as per Zetwerk compliance template.",
  },
  {
    key: "gst_certificate",
    label: "GST Registration Certificate",
    category: "tax",
    description: "Latest GST registration certificate issued by the government.",
  },
  {
    key: "cancelled_cheque",
    label: "Cancelled Cheque",
    category: "banking",
    description: "Scanned copy of a cancelled cheque for the pay-out account.",
  },
  {
    key: "pan_card",
    label: "PAN Card",
    category: "tax",
    description: "Permanent Account Number card of the legal entity.",
  },
  {
    key: "international_onboarding_pack",
    label: "International Onboarding Documents",
    category: "compliance",
    description: "Optional documentation required for cross-border onboarding.",
  },
  {
    key: "itr_two_year",
    label: "Income Tax Returns - 2 Years",
    category: "financials",
    description: "Audited income tax returns for the last two financial years.",
  },
  {
    key: "bank_statement_six_month",
    label: "Bank Statement - 6 Months",
    category: "financials",
    description: "Latest six months bank statements for the primary account.",
  },
  {
    key: "factory_photos_indoor",
    label: "Factory Photos - Indoor",
    category: "factory_profile",
    description: "Images of the factory/workshop interiors.",
  },
  {
    key: "factory_photos_outdoor",
    label: "Factory Photos - Outdoor",
    category: "factory_profile",
    description: "Images of the factory/workshop exteriors.",
  },
  {
    key: "supplier_brochure",
    label: "Supplier Brochure",
    category: "marketing",
    description: "Brochure or capability deck shared with customers.",
  },
  {
    key: "awards_appreciations",
    label: "Awards / Appreciations",
    category: "marketing",
    description: "Certificates or letters highlighting recognitions.",
  },
] as const;

const documentRequirementsData = [
  {
    documentTypeKey: "anti_bribery_declaration",
    required: true,
    helpText: "Mandatory for all Indian suppliers.",
  },
  {
    documentTypeKey: "gst_certificate",
    required: true,
    helpText: "Upload the signed GST certificate (all pages).",
  },
  {
    documentTypeKey: "cancelled_cheque",
    required: true,
    helpText: "Used to verify beneficiary bank account details.",
  },
  {
    documentTypeKey: "pan_card",
    required: true,
    helpText: "Ensure the PAN matches the legal entity name.",
  },
  {
    documentTypeKey: "itr_two_year",
    required: true,
    helpText: "Submit the last two filed ITR acknowledgements.",
  },
  {
    documentTypeKey: "bank_statement_six_month",
    required: true,
    helpText: "Share the latest six months of bank statements.",
  },
  {
    documentTypeKey: "international_onboarding_pack",
    required: false,
    helpText: "Only needed for export or cross-border transactions.",
  },
  {
    documentTypeKey: "factory_photos_indoor",
    required: false,
    helpText: "Helps procurement teams review capacity.",
  },
  {
    documentTypeKey: "factory_photos_outdoor",
    required: false,
    helpText: "Helps procurement teams review facility scale.",
  },
  {
    documentTypeKey: "supplier_brochure",
    required: false,
    helpText: "Optional marketing collateral.",
  },
  {
    documentTypeKey: "awards_appreciations",
    required: false,
    helpText: "Optional recognitions and certificates.",
  },
] as const;

async function main() {
  const entity = await prisma.entity.upsert({
    where: { code: ENTITY_CODE },
    update: { name: "Zetwerk" },
    create: {
      code: ENTITY_CODE,
      name: "Zetwerk",
      description: "Default Zetwerk legal entity",
    },
  });

  const geography = await prisma.geography.upsert({
    where: { code: GEOGRAPHY_CODE },
    update: { name: "India" },
    create: {
      code: GEOGRAPHY_CODE,
      name: "India",
    },
  });

  await prisma.entityGeography.upsert({
    where: {
      entityId_geographyId: {
        entityId: entity.id,
        geographyId: geography.id,
      },
    },
    update: {},
    create: {
      entityId: entity.id,
      geographyId: geography.id,
    },
  });

  const existingConfig = await prisma.formConfig.findFirst({
    where: {
      entityId: entity.id,
      geographyId: geography.id,
      version: FORM_VERSION,
    },
  });

  if (existingConfig) {
    console.log("Existing ZET-IN form configuration found. Deleting it first…");
    await prisma.formConfig.delete({ where: { id: existingConfig.id } });
  }

  const documentTypeMap = new Map<string, { id: string; label: string }>();

  for (const docType of documentTypesData) {
    const record = await prisma.documentType.upsert({
      where: { key: docType.key },
      update: {
        label: docType.label,
        category: docType.category,
        description: docType.description,
      },
      create: docType,
    });
    documentTypeMap.set(docType.key, { id: record.id, label: record.label });
  }

  const formConfig = await prisma.formConfig.create({
    data: {
      entityId: entity.id,
      geographyId: geography.id,
      version: FORM_VERSION,
      title: "Zetwerk India Supplier Onboarding",
      description:
        "Form covering KYC, banking, taxation and capability information for Indian suppliers.",
      isActive: true,
      sections: {
        create: sections.map((section) => ({
          key: section.key,
          label: section.label,
          order: section.order,
          fields: {
            create: section.fields.map((field) => ({
              key: field.key,
              label: field.label,
              type: field.type,
              order: field.order,
              required: field.required ?? false,
              placeholder: field.placeholder,
              helpText: field.helpText,
              options: field.options ?? undefined,
              validation: field.validation ?? undefined,
              visibility: field.visibility ?? undefined,
              isSensitive: field.isSensitive ?? false,
            })),
          },
        })),
      },
      documentRules: {
        create: documentRequirementsData.map((requirement) => {
          const documentType = documentTypeMap.get(requirement.documentTypeKey);
          if (!documentType) {
            throw new Error(
              `Missing document type ${requirement.documentTypeKey} while creating requirement.`
            );
          }
          return {
            documentTypeId: documentType.id,
            required: requirement.required,
            helpText: requirement.helpText,
          };
        }),
      },
    },
    include: {
      sections: {
        include: {
          fields: true,
        },
      },
      documentRules: {
        include: {
          documentType: true,
        },
      },
    },
  });

  const totalFields = formConfig.sections.reduce(
    (sum, section) => sum + section.fields.length,
    0
  );

  console.log("✅ Created Zetwerk India form configuration");
  console.log(`- Entity: ${entity.name} (${entity.code})`);
  console.log(`- Geography: ${geography.name} (${geography.code})`);
  console.log(`- Version: ${formConfig.version}`);
  console.log(`- Sections: ${formConfig.sections.length}`);
  console.log(`- Total fields: ${totalFields}`);

  formConfig.sections.forEach((section) => {
    console.log(`  • ${section.label}: ${section.fields.length} fields`);
  });

  console.log("\n📄 Document Requirements:");
  formConfig.documentRules.forEach((rule) => {
    console.log(
      `  • ${rule.documentType.label} — ${rule.required ? "Required" : "Optional"}`
    );
  });
}

main()
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


