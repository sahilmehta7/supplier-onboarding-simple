import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUserMembership, requireAdmin } from "@/lib/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const membership = await getCurrentUserMembership();
    
    if (!membership) {
      return NextResponse.json(
        { error: "No organization membership found" },
        { status: 403 }
      );
    }

    // Check if user is admin
    await requireAdmin(membership.organizationId);

    // Prevent users from modifying their own role
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot modify your own role" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (
      !role ||
      !["ADMIN", "MEMBER"].includes(role)
    ) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'ADMIN' or 'MEMBER'" },
        { status: 400 }
      );
    }

    // Verify the user belongs to the same organization
    const targetMembership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId: membership.organizationId,
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "User not found in organization" },
        { status: 404 }
      );
    }

    // Check if this is the last admin
    if (targetMembership.role === "ADMIN" && role === "MEMBER") {
      const adminCount = await prisma.membership.count({
        where: {
          organizationId: membership.organizationId,
          role: "ADMIN",
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin" },
          { status: 400 }
        );
      }
    }

    // Update the role
    await prisma.membership.update({
      where: { id: targetMembership.id },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const membership = await getCurrentUserMembership();
    
    if (!membership) {
      return NextResponse.json(
        { error: "No organization membership found" },
        { status: 403 }
      );
    }

    // Check if user is admin
    await requireAdmin(membership.organizationId);

    // Prevent users from deleting themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 }
      );
    }

    // Verify the user belongs to the same organization
    const targetMembership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId: membership.organizationId,
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "User not found in organization" },
        { status: 404 }
      );
    }

    // Check if this is the last admin
    if (targetMembership.role === "ADMIN") {
      const adminCount = await prisma.membership.count({
        where: {
          organizationId: membership.organizationId,
          role: "ADMIN",
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin" },
          { status: 400 }
        );
      }
    }

    // Delete the membership (cascade will handle user if needed)
    await prisma.membership.delete({
      where: { id: targetMembership.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

