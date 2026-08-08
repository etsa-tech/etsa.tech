import { NextRequest, NextResponse } from "next/server";
import { resolveSocialRoute } from "@/lib/social/route-guard";
import { getSocialDraftContent } from "@/lib/social/post-data";
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

    const content = await getSocialDraftContent(slug);
    const { campaignId, campaignUrl } = await provider.createDraft({
      slug,
      ...content,
      createdBy: session?.user?.email ?? "unknown",
    });

    const cached = await saveCachedSocialRecord(
      slug,
      providerName,
      {
        campaignId,
        campaignUrl,
        status: "draft",
        // A new draft invalidates any prior test history for THIS campaign -
        // the send gate must see a fresh test against the current content.
        testRecipients: [],
        sentAt: null,
        sentBy: null,
      },
      session?.user?.email ?? null,
    );

    return NextResponse.json({ cached });
  } catch (error) {
    console.error("Error creating social draft:", error);
    return NextResponse.json(
      { error: "Failed to create social draft" },
      { status: 500 },
    );
  }
}
