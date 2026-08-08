import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getProvider } from "@/lib/social";
import { getSocialDraftContent } from "@/lib/social/post-data";
import { saveCachedSocialRecord } from "@/lib/social-cache";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; provider: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, provider: providerName } = await params;
    const provider = getProvider(providerName);
    if (!provider) {
      return NextResponse.json(
        { error: `Unknown social provider: ${providerName}` },
        { status: 404 },
      );
    }

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
