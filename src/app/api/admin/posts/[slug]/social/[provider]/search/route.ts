import { NextRequest, NextResponse } from "next/server";
import { resolveSocialRoute } from "@/lib/social/route-guard";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; provider: string }> },
) {
  try {
    const ctx = await resolveSocialRoute(params);
    if (ctx instanceof NextResponse) return ctx;
    const { provider } = ctx;

    const query = request.nextUrl.searchParams.get("q")?.trim();
    if (!query) {
      return NextResponse.json({ contacts: [] });
    }

    const contacts = await provider.searchContacts(query);
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Error searching social contacts:", error);
    return NextResponse.json(
      { error: "Failed to search contacts" },
      { status: 500 },
    );
  }
}
