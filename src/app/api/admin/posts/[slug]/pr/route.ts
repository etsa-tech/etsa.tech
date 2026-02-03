import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getOpenPRForPost } from "@/lib/github";

// Force dynamic rendering - don't try to statically analyze this route
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const openPR = await getOpenPRForPost(slug);

    return NextResponse.json({
      openPR,
    });
  } catch (error) {
    console.error("Error getting open PR for post:", error);
    return NextResponse.json(
      { error: "Failed to get open PR information" },
      { status: 500 },
    );
  }
}
