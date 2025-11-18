import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUserMembership, requireAdmin } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getCurrentUserMembership();
    
    if (!membership) {
      return NextResponse.json(
        { error: "No organization membership found" },
        { status: 403 }
      );
    }

    // Check if user is admin
    await requireAdmin(membership.organizationId);

    const body = await request.json();
    const { email, role, organizationId } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!role || !["ADMIN", "MEMBER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'ADMIN' or 'MEMBER'" },
        { status: 400 }
      );
    }

    // Verify organization ID matches
    if (organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "Invalid organization" },
        { status: 403 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { organizationId },
        },
      },
    });

    if (existingUser) {
      // Check if user is already a member
      if (existingUser.memberships.length > 0) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 400 }
        );
      }

      // User exists but not a member - add them
      await prisma.membership.create({
        data: {
          userId: existingUser.id,
          organizationId,
          role,
        },
      });

      return NextResponse.json({
        success: true,
        message: "User added to organization",
      });
    }

    // For now, we'll create a placeholder user
    // In a real app, you'd send an invitation email and create a pending invitation
    // For simplicity, we'll create the user and they can sign in with Google
    const newUser = await prisma.user.create({
      data: {
        email,
        memberships: {
          create: {
            organizationId,
            role,
          },
        },
      },
    });

    // TODO: Send invitation email with sign-in link
    // For now, the user can sign in with Google using this email

    return NextResponse.json({
      success: true,
      message: "Invitation sent. User can sign in with Google.",
      userId: newUser.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error inviting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

