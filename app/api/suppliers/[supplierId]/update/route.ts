import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createUpdateApplication } from "@/lib/suppliers";
import { SupplierWizardData } from "@/lib/supplierWizardSchema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Invalid data provided" },
        { status: 400 }
      );
    }

    const application = await createUpdateApplication(
      supplierId,
      session.user.id,
      data as Partial<SupplierWizardData>
    );

    return NextResponse.json({
      applicationId: application.id,
      message: "Update request created successfully",
    });
  } catch (error) {
    console.error("Error creating update application:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

