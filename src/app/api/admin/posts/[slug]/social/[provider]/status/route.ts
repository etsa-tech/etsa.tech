import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getCachedSocialRecord } from "@/lib/social-cache";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; provider: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, provider } = await params;
    const cached = await getCachedSocialRecord(slug, provider);
    return NextResponse.json({ cached });
  } catch (error) {
    console.error("Error loading social send status:", error);
    return NextResponse.json(
      { error: "Failed to load social send status" },
      { status: 500 },
    );
  }
}
