import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Look up existing Entity (code: "UNX") and Geography (code: "US")
  const entity = await prisma.entity.findUnique({
    where: { code: "UNX" },
  });

  if (!entity) {
    throw new Error("Entity with code 'UNX' not found in database");
  }

  const geography = await prisma.geography.findUnique({
    where: { code: "US" },
  });

  if (!geography) {
    throw new Error("Geography with code 'US' not found in database");
  }

  console.log(`Found Entity: ${entity.name} (${entity.code})`);
  console.log(`Found Geography: ${geography.name} (${geography.code})`);

  // 2. Check for existing FormConfig for UNX/US combination
  const existingConfig = await prisma.formConfig.findFirst({
    where: {
      entityId: entity.id,
      geographyId: geography.id,
      version: 1,
    },
    include: {
      sections: {
        include: {
          fields: true,
        },
      },
    },
  });

  // 3. Delete existing FormConfig if found (idempotent)
  if (existingConfig) {
    console.log("Existing form configuration found. Deleting to recreate...");
    await prisma.formConfig.delete({
      where: { id: existingConfig.id },
    });
    console.log("✓ Deleted existing form configuration");
  }

  // 4. Create single FormConfig with all sections and fields
  console.log("\nCreating form configuration...");
  const formConfig = await prisma.formConfig.create({
    data: {
      entityId: entity.id,
      geographyId: geography.id,
      version: 1,
      title: "Unimacts Supplier Onboarding",
      description: "Form for setting up new suppliers, adding new supplier sites, or updating existing supplier information",
      isActive: true,
      sections: {
        create: [
          {
            key: "requestor",
            label: "REQUESTOR",
            order: 1,
            fields: {
              create: [
                {
                  key: "entity",
                  label: "ENTITY",
                  type: "text",
                  required: false,
                  order: 1,
                },
                {
                  key: "date",
                  label: "DATE",
                  type: "date",
                  required: true,
                  order: 2,
                },
                {
                  key: "if_updating_reason",
                  label: "IF UPDATING, REASON :",
                  type: "text",
                  required: false,
                  order: 3,
                  placeholder: "Provide reason for update",
                },
                {
                  key: "position",
                  label: "POSITION",
                  type: "text",
                  required: true,
                  order: 4,
                },
                {
                  key: "submitted_by",
                  label: "SUBMITTED BY",
                  type: "text",
                  required: true,
                  order: 5,
                },
                {
                  key: "signature",
                  label: "SIGNATURE",
                  type: "text",
                  required: true,
                  order: 6,
                },
              ],
            },
          },
          {
            key: "supplier_information",
            label: "SUPPLIER INFORMATION",
            order: 2,
            fields: {
              create: [
                {
                  key: "supplier_name",
                  label: "SUPPLIER NAME",
                  type: "text",
                  required: true,
                  order: 1,
                },
                {
                  key: "payment_method",
                  label: "PAYMENT METHOD",
                  type: "select",
                  required: true,
                  order: 2,
                  options: {
                    values: ["Wire Transfer", "ACH", "Check", "Other"],
                  },
                },
                {
                  key: "payment_terms",
                  label: "PAYMENT TERMS",
                  type: "text",
                  required: true,
                  order: 3,
                },
                {
                  key: "payment_invoice_currency",
                  label: "PAYMENT / INVOICE CURRENCY",
                  type: "select",
                  required: true,
                  order: 4,
                  options: {
                    values: ["USD", "EUR", "GBP", "Other"],
                  },
                },
                {
                  key: "inco_terms",
                  label: "INCO TERMS",
                  type: "select",
                  required: true,
                  order: 5,
                  options: {
                    values: [
                      "EXW",
                      "FCA",
                      "CPT",
                      "CIP",
                      "DAP",
                      "DPU",
                      "DDP",
                      "FAS",
                      "FOB",
                      "CFR",
                      "CIF",
                    ],
                  },
                },
                {
                  key: "named_place",
                  label: "NAMED PLACE",
                  type: "text",
                  required: true,
                  order: 6,
                  placeholder: "Delivery location",
                },
                {
                  key: "supplier_sales_contact_name",
                  label: "SUPPLIER SALES CONTACT NAME",
                  type: "text",
                  required: true,
                  order: 7,
                },
                {
                  key: "supplier_sales_contact_email",
                  label: "SUPPLIER SALES CONTACT E-MAIL",
                  type: "email",
                  required: true,
                  order: 8,
                },
                {
                  key: "supplier_sales_contact_tel",
                  label: "SUPPLIER SALES CONTACT TEL",
                  type: "text",
                  required: true,
                  order: 9,
                  validation: {
                    regex: "^[+]?[(]?[0-9]{3}[)]?[-s.]?[0-9]{3}[-s.]?[0-9]{4,6}$",
                    message: "Please enter a valid phone number",
                  },
                },
                {
                  key: "supplier_contact_fax",
                  label: "SUPPLIER CONTACT FAX",
                  type: "text",
                  required: true,
                  order: 10,
                },
                {
                  key: "supplier_notification_method",
                  label: "SUPPLIER NOTIFICATION METHOD?",
                  type: "select",
                  required: false,
                  order: 11,
                  options: {
                    values: ["Email", "Fax", "Portal", "Other"],
                  },
                },
                {
                  key: "supplier_accounting_email_address_name",
                  label: "SUPPLIER ACCOUNTING EMAIL ADDRESS & Name",
                  type: "text",
                  required: true,
                  order: 12,
                  placeholder: "email@example.com, Name",
                },
                {
                  key: "inactive_date",
                  label: "INACTIVE DATE",
                  type: "date",
                  required: false,
                  order: 13,
                },
                {
                  key: "additional_remarks",
                  label: "ADDITIONAL REMARKS",
                  type: "textarea",
                  required: false,
                  order: 14,
                },
              ],
            },
          },
          {
            key: "physical_location",
            label: "PHYSICAL LOCATION",
            order: 3,
            fields: {
              create: [
                {
                  key: "physical_name_if_different",
                  label: "NAME, IF DIFFERENT FROM ABOVE",
                  type: "text",
                  required: true,
                  order: 1,
                },
                {
                  key: "physical_address_line_1",
                  label: "ADDRESS LINE 1",
                  type: "text",
                  required: true,
                  order: 2,
                },
                {
                  key: "physical_address_line_2",
                  label: "ADDRESS LINE 2",
                  type: "text",
                  required: true,
                  order: 3,
                },
                {
                  key: "physical_city",
                  label: "CITY",
                  type: "text",
                  required: true,
                  order: 4,
                },
                {
                  key: "physical_state",
                  label: "STATE",
                  type: "text",
                  required: true,
                  order: 5,
                },
                {
                  key: "physical_postal_code",
                  label: "POSTAL CODE",
                  type: "text",
                  required: true,
                  order: 6,
                },
                {
                  key: "physical_county",
                  label: "COUNTY",
                  type: "text",
                  required: true,
                  order: 7,
                },
                {
                  key: "physical_country",
                  label: "COUNTRY",
                  type: "text",
                  required: true,
                  order: 8,
                  placeholder: "US",
                },
              ],
            },
          },
          {
            key: "additional_site",
            label: "ADDITIONAL SITE",
            order: 4,
            fields: {
              create: [
                {
                  key: "additional_name_if_different",
                  label: "NAME, IF DIFFERENT FROM ABOVE",
                  type: "text",
                  required: false,
                  order: 1,
                },
                {
                  key: "additional_address_line_1",
                  label: "ADDRESS LINE 1",
                  type: "text",
                  required: false,
                  order: 2,
                },
                {
                  key: "additional_address_line_2",
                  label: "ADDRESS LINE 2",
                  type: "text",
                  required: false,
                  order: 3,
                },
                {
                  key: "additional_city",
                  label: "CITY",
                  type: "text",
                  required: false,
                  order: 4,
                },
                {
                  key: "additional_state",
                  label: "STATE",
                  type: "text",
                  required: false,
                  order: 5,
                },
                {
                  key: "additional_postal_code",
                  label: "POSTAL CODE",
                  type: "text",
                  required: true,
                  order: 6,
                },
                {
                  key: "additional_county",
                  label: "COUNTY",
                  type: "text",
                  required: true,
                  order: 7,
                },
                {
                  key: "additional_country",
                  label: "COUNTRY",
                  type: "text",
                  required: true,
                  order: 8,
                  placeholder: "US",
                },
              ],
            },
          },
          {
            key: "bank_information",
            label: "BANK INFORMATION",
            order: 5,
            fields: {
              create: [
                {
                  key: "bank_name",
                  label: "BANK NAME",
                  type: "text",
                  required: true,
                  order: 1,
                },
                {
                  key: "beneficiary_name",
                  label: "BENEFICIARY NAME",
                  type: "text",
                  required: false,
                  order: 2,
                },
                {
                  key: "bank_branch",
                  label: "BANK BRANCH",
                  type: "text",
                  required: false,
                  order: 3,
                },
                {
                  key: "us_routing_aba_wire",
                  label: "US ROUTING (ABA) # VIA WIRE",
                  type: "text",
                  required: true,
                  order: 4,
                  helpText:
                    "Note - larger banks in the US use a different ABA # for wires and ACH. Please check with your bank to confirm your bank account instructions.",
                  validation: {
                    regex: "^[0-9]{9}$",
                    message: "Must be 9 digits",
                  },
                },
                {
                  key: "us_routing_aba_ach",
                  label: "US ROUTING (ABA) # VIA ACH",
                  type: "text",
                  required: true,
                  order: 5,
                  helpText:
                    "Note - larger banks in the US use a different ABA # for wires and ACH. Please check with your bank to confirm your bank account instructions.",
                  validation: {
                    regex: "^[0-9]{9}$",
                    message: "Must be 9 digits",
                  },
                },
                {
                  key: "bank_address_line_1",
                  label: "ADDRESS LINE 1",
                  type: "text",
                  required: false,
                  order: 6,
                },
                {
                  key: "bank_account_number",
                  label: "BANK ACCOUNT NUMBER",
                  type: "text",
                  required: true,
                  order: 7,
                  isSensitive: true,
                },
                {
                  key: "bank_address_line_2",
                  label: "ADDRESS LINE 2",
                  type: "text",
                  required: false,
                  order: 8,
                },
                {
                  key: "iban",
                  label: "IBAN - International Bank Account Number (See below **)",
                  type: "text",
                  required: false,
                  order: 9,
                },
                {
                  key: "bank_city",
                  label: "CITY",
                  type: "text",
                  required: false,
                  order: 10,
                },
                {
                  key: "bank_state",
                  label: "STATE",
                  type: "text",
                  required: false,
                  order: 11,
                },
                {
                  key: "bank_country",
                  label: "COUNTRY",
                  type: "text",
                  required: false,
                  order: 12,
                },
                {
                  key: "bic_swift",
                  label: "BIC / SWIFT (8 OR 11 Alphanumeric)",
                  type: "text",
                  required: false,
                  order: 13,
                  validation: {
                    regex: "^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$",
                    message: "Must be 8 or 11 alphanumeric characters",
                  },
                },
                {
                  key: "ifsc_code",
                  label: "IFSC CODE",
                  type: "text",
                  required: false,
                  order: 14,
                },
                {
                  key: "remittance_email_address",
                  label: "REMITTANCE EMAIL ADDRESS",
                  type: "email",
                  required: false,
                  order: 15,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      sections: {
        include: {
          fields: true,
        },
      },
    },
  });

  console.log("✓ Created form configuration: " + formConfig.title);
  console.log(`✓ Created ${formConfig.sections.length} sections`);
  
  const totalFields = formConfig.sections.reduce(
    (sum, section) => sum + section.fields.length,
    0
  );
  console.log(`✓ Created ${totalFields} fields`);

  // 5. Print summary
  console.log("\n✅ Form configuration created successfully!");
  console.log("\nSummary:");
  console.log(`- Entity: ${entity.name} (${entity.code})`);
  console.log(`- Geography: ${geography.name} (${geography.code})`);
  console.log(`- Form Title: ${formConfig.title}`);
  console.log(`- Version: ${formConfig.version}`);
  console.log(`- Sections: ${formConfig.sections.length}`);
  console.log(`- Total Fields: ${totalFields}`);
  
  formConfig.sections.forEach((section) => {
    console.log(`  - ${section.label}: ${section.fields.length} fields`);
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

