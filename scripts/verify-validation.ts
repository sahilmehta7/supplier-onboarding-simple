import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildFormSchema } from "@/lib/form-schema";
import type { FormConfigWithFields } from "@/lib/forms/types";

async function main() {
    console.log("Starting validation verification...");

    // 1. Fetch a preset
    const gstPreset = await prisma.validationPreset.findUnique({
        where: { name: "Indian GST" },
    });

    if (!gstPreset) {
        console.error("❌ Indian GST preset not found");
        process.exit(1);
    }
    console.log("✅ Found Indian GST preset");

    // 2. Mock Form Config
    const mockConfig: FormConfigWithFields = {
        id: "mock-form",
        entityId: "mock-entity",
        geographyId: "mock-geo",
        version: 1,
        title: "Mock Form",
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: [
            {
                id: "section-1",
                formConfigId: "mock-form",
                key: "test_section",
                label: "Test Section",
                order: 1,
                visibility: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                fields: [
                    {
                        id: "field-gst",
                        sectionId: "section-1",
                        key: "gst_number",
                        label: "GST Number",
                        type: "text",
                        required: true,
                        order: 1,
                        placeholder: null,
                        helpText: null,
                        options: null,
                        visibility: null,
                        isSensitive: false,
                        validation: gstPreset.rules, // Apply preset rules
                        externalValidator: null,
                        validatorParams: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        id: "field-mock",
                        sectionId: "section-1",
                        key: "mock_check",
                        label: "Mock Check",
                        type: "text",
                        required: true,
                        order: 2,
                        placeholder: null,
                        helpText: null,
                        options: null,
                        visibility: null,
                        isSensitive: false,
                        validation: null,
                        externalValidator: "MOCK_NAME_CHECK", // Apply external validator
                        validatorParams: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            },
        ],
        documentRules: [],
        entity: {} as any,
        geography: {} as any,
    };

    // 3. Build Schema
    const schema = buildFormSchema(mockConfig);
    console.log("✅ Schema built successfully");

    // 4. Test Cases
    const testCases = [
        {
            name: "Valid Data",
            data: {
                gst_number: "22AAAAA0000A1Z5",
                mock_check: "Valid Value",
            },
            shouldPass: true,
        },
        {
            name: "Invalid GST",
            data: {
                gst_number: "INVALID",
                mock_check: "Valid Value",
            },
            shouldPass: false,
        },
        {
            name: "Invalid Mock Check",
            data: {
                gst_number: "22AAAAA0000A1Z5",
                mock_check: "Invalid Value",
            },
            shouldPass: false,
        },
    ];

    for (const test of testCases) {
        try {
            await schema.parseAsync(test.data);
            if (test.shouldPass) {
                console.log(`✅ Test '${test.name}' passed as expected`);
            } else {
                console.error(`❌ Test '${test.name}' passed but should have failed`);
            }
        } catch (error) {
            if (!test.shouldPass) {
                console.log(`✅ Test '${test.name}' failed as expected`);
            } else {
                console.error(`❌ Test '${test.name}' failed but should have passed`);
                if (error instanceof z.ZodError) {
                    console.error(JSON.stringify(error.issues, null, 2));
                }
            }
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
