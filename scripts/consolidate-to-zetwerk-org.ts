#!/usr/bin/env tsx
/**
 * Database cleanup script to consolidate all data under single "Zetwerk" organization
 * Run with: npx tsx scripts/consolidate-to-zetwerk-org.ts
 */

import { prisma } from "../lib/prisma";

async function main() {
    console.log("🔧 Starting database consolidation to Zetwerk organization...\n");

    // Step 1: Find or create Zetwerk organization
    console.log("Step 1: Finding or creating Zetwerk organization...");
    let zetwerkOrg = await prisma.organization.findUnique({
        where: { slug: "zetwerk" },
    });

    if (!zetwerkOrg) {
        zetwerkOrg = await prisma.organization.create({
            data: {
                name: "Zetwerk",
                slug: "zetwerk",
            },
        });
        console.log("✅ Created Zetwerk organization:", zetwerkOrg.id);
    } else {
        console.log("✅ Found existing Zetwerk organization:", zetwerkOrg.id);
    }

    // Step 2: Move all users to Zetwerk org
    console.log("\nStep 2: Consolidating user memberships...");

    const allUsers = await prisma.user.findMany({
        include: { memberships: true },
    });

    for (const user of allUsers) {
        const zetwerkMembership = user.memberships.find(
            (m) => m.organizationId === zetwerkOrg.id
        );

        if (!zetwerkMembership) {
            // User doesn't have Zetwerk membership, create one
            // Preserve their highest role from other orgs
            const highestRole = user.memberships[0]?.role || "SUPPLIER";

            await prisma.membership.create({
                data: {
                    userId: user.id,
                    organizationId: zetwerkOrg.id,
                    role: highestRole,
                },
            });
            console.log(`  ✅ Added ${user.email} to Zetwerk org with role ${highestRole}`);
        } else {
            console.log(`  ⏭️  ${user.email} already in Zetwerk org`);
        }
    }

    // Step 3: Delete other organization memberships
    console.log("\nStep 3: Removing memberships from other organizations...");
    const deletedMemberships = await prisma.membership.deleteMany({
        where: {
            organizationId: { not: zetwerkOrg.id },
        },
    });
    console.log(`✅ Deleted ${deletedMemberships.count} memberships from other orgs`);

    // Step 4: Move all applications to Zetwerk
    console.log("\nStep 4: Moving applications to Zetwerk...");
    const updatedApps = await prisma.application.updateMany({
        where: {
            organizationId: { not: zetwerkOrg.id },
        },
        data: {
            organizationId: zetwerkOrg.id,
        },
    });
    console.log(`✅ Updated ${updatedApps.count} applications`);

    // Step 5: Move all suppliers to Zetwerk
    console.log("\nStep 5: Moving suppliers to Zetwerk...");
    const updatedSuppliers = await prisma.supplier.updateMany({
        where: {
            organizationId: { not: zetwerkOrg.id },
        },
        data: {
            organizationId: zetwerkOrg.id,
        },
    });
    console.log(`✅ Updated ${updatedSuppliers.count} suppliers`);

    // Step 6: Delete other organizations
    console.log("\nStep 6: Deleting other organizations...");
    const otherOrgs = await prisma.organization.findMany({
        where: {
            id: { not: zetwerkOrg.id },
        },
        select: { id: true, name: true, slug: true },
    });

    for (const org of otherOrgs) {
        await prisma.organization.delete({
            where: { id: org.id },
        });
        console.log(`  ✅ Deleted organization: ${org.name} (${org.slug})`);
    }

    // Step 7: Summary
    console.log("\n📊 Final Summary:");
    const finalStats = await prisma.$transaction([
        prisma.organization.count(),
        prisma.user.count(),
        prisma.membership.count(),
        prisma.application.count(),
        prisma.supplier.count(),
        prisma.entity.count(),
        prisma.geography.count(),
        prisma.formConfig.count(),
    ]);

    console.log(`  Organizations: ${finalStats[0]}`);
    console.log(`  Users: ${finalStats[1]}`);
    console.log(`  Memberships: ${finalStats[2]}`);
    console.log(`  Applications: ${finalStats[3]}`);
    console.log(`  Suppliers: ${finalStats[4]}`);
    console.log(`  Entities: ${finalStats[5]}`);
    console.log(`  Geographies: ${finalStats[6]}`);
    console.log(`  Form Configs: ${finalStats[7]}`);

    console.log("\n✨ Database consolidation complete!");
    console.log("All data is now under the Zetwerk organization.");
}

main()
    .catch((error) => {
        console.error("❌ Error during consolidation:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
