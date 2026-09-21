import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/rbac/authz";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
      },
    });
  } catch (error: any) {
    console.error("POST /api/auth/sync-client error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync client account" },
      { status: 500 }
    );
  }
}
