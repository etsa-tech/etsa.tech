import { NextRequest, NextResponse } from "next/server";
import { resolveSocialRoute } from "@/lib/social/route-guard";
import { getCachedSocialRecord } from "@/lib/social-cache";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; provider: string }> },
) {
  try {
    const ctx = await resolveSocialRoute(params);
    if (ctx instanceof NextResponse) return ctx;
    const { slug, providerName } = ctx;

    const cached = await getCachedSocialRecord(slug, providerName);
    return NextResponse.json({ cached });
  } catch (error) {
    console.error("Error loading social send status:", error);
    return NextResponse.json(
      { error: "Failed to load social send status" },
      { status: 500 },
    );
  }
}
