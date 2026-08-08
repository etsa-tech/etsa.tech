import { NextRequest, NextResponse } from "next/server";
import {
  resolveSocialRoute,
  requireDraftedCampaign,
} from "@/lib/social/route-guard";
import { getPublishedPostFrontmatter } from "@/lib/social/post-data";
import { saveCachedSocialRecord } from "@/lib/social-cache";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; provider: string }> },
) {
  try {
    const ctx = await resolveSocialRoute(params);
    if (ctx instanceof NextResponse) return ctx;
    const { session, slug, providerName, provider } = ctx;

    const { confirm } = (await request.json()) as { confirm?: unknown };
    const { title } = await getPublishedPostFrontmatter(slug);
    if (confirm !== title) {
      return NextResponse.json(
        { error: "Confirmation text does not match the post title" },
        { status: 400 },
      );
    }

    const existing = await requireDraftedCampaign(slug, providerName);
    if (existing instanceof NextResponse) return existing;

    // The hard gate: a live send to the real audience is refused unless a
    // test send against this exact campaign has already happened. Creating
    // a new draft clears testRecipients, so this can't be satisfied by a
    // stale test against different content.
    if (existing.status !== "tested" || existing.testRecipients.length === 0) {
      return NextResponse.json(
        {
          error: "A test send is required before sending to the full audience",
        },
        { status: 400 },
      );
    }

    await provider.publish(existing.campaignId);

    const cached = await saveCachedSocialRecord(
      slug,
      providerName,
      {
        status: "sent",
        sentAt: new Date().toISOString(),
        sentBy: session?.user?.email ?? null,
      },
      session?.user?.email ?? null,
    );

    return NextResponse.json({ cached });
  } catch (error) {
    console.error("Error sending social campaign:", error);
    return NextResponse.json(
      { error: "Failed to send campaign" },
      { status: 500 },
    );
  }
}
