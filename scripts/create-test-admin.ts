#!/usr/bin/env tsx
/**
 * Creates a test admin user with an active session for local testing.
 * 
 * Usage:
 *   npx tsx scripts/create-test-admin.ts
 * 
 * This will:
 * 1. Create or update a test admin user
 * 2. Create a test organization
 * 3. Assign ADMIN role to the user
 * 4. Create a session token that can be used to sign in
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
    console.log("🔧 Creating test admin user...");

    const testEmail = "admin@test.local";
    const testName = "Test Admin";

    // Create or find the test user
    let user = await prisma.user.findUnique({
        where: { email: testEmail },
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: testEmail,
                name: testName,
                emailVerified: new Date(),
            },
        });
        console.log(`✅ Created user: ${testEmail}`);
    } else {
        console.log(`ℹ️  User already exists: ${testEmail}`);
    }

    // Create or find a test organization
    let organization = await prisma.organization.findUnique({
        where: { slug: "test-org" },
    });

    if (!organization) {
        organization = await prisma.organization.create({
            data: {
                name: "Test Organization",
                slug: "test-org",
            },
        });
        console.log(`✅ Created organization: Test Organization`);
    } else {
        console.log(`ℹ️  Organization already exists: Test Organization`);
    }

    // Create or update membership with ADMIN role
    const existingMembership = await prisma.membership.findUnique({
        where: {
            userId_organizationId: {
                userId: user.id,
                organizationId: organization.id,
            },
        },
    });

    if (!existingMembership) {
        await prisma.membership.create({
            data: {
                userId: user.id,
                organizationId: organization.id,
                role: "ADMIN",
            },
        });
        console.log(`✅ Created ADMIN membership`);
    } else if (existingMembership.role !== "ADMIN") {
        await prisma.membership.update({
            where: {
                userId_organizationId: {
                    userId: user.id,
                    organizationId: organization.id,
                },
            },
            data: {
                role: "ADMIN",
            },
        });
        console.log(`✅ Updated membership to ADMIN role`);
    } else {
        console.log(`ℹ️  User already has ADMIN membership`);
    }

    // Delete any existing sessions for this user
    await prisma.session.deleteMany({
        where: { userId: user.id },
    });

    // Create a new session with a long expiry (30 days)
    const sessionToken = randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    await prisma.session.create({
        data: {
            sessionToken,
            userId: user.id,
            expires,
        },
    });

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Test admin user created successfully!");
    console.log("=".repeat(60));
    console.log(`\n📧 Email: ${testEmail}`);
    console.log(`👤 Name: ${testName}`);
    console.log(`🔑 Role: ADMIN`);
    console.log(`🏢 Organization: ${organization.name}`);
    console.log(`\n🍪 Session Token:\n${sessionToken}`);
    console.log("\n" + "=".repeat(60));
    console.log("📋 TO SIGN IN:");
    console.log("=".repeat(60));
    console.log("\n1. Open your browser's Developer Tools");
    console.log("2. Go to Application/Storage → Cookies");
    console.log("3. Add a new cookie with the following details:");
    console.log(`   - Name: next-auth.session-token`);
    console.log(`   - Value: ${sessionToken}`);
    console.log(`   - Domain: localhost`);
    console.log(`   - Path: /`);
    console.log(`   - Expires: (set to 30 days from now)`);
    console.log(`   - HttpOnly: ✓ (checked)`);
    console.log(`   - Secure: ✗ (unchecked for localhost)`);
    console.log(`   - SameSite: Lax`);
    console.log("\n4. Refresh the page");
    console.log("5. You should now be signed in!");
    console.log("\n" + "=".repeat(60));
}

main()
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
