import { NextRequest, NextResponse } from "next/server";
import {
  resolveSocialRoute,
  requireDraftedCampaign,
} from "@/lib/social/route-guard";
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

    const { emails } = (await request.json()) as { emails?: unknown };
    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "At least one test recipient email is required" },
        { status: 400 },
      );
    }

    const existing = await requireDraftedCampaign(slug, providerName);
    if (existing instanceof NextResponse) return existing;

    await provider.sendTest(existing.campaignId!, emails as string[]);

    const cached = await saveCachedSocialRecord(
      slug,
      providerName,
      {
        status: "tested",
        testRecipients: Array.from(
          new Set([...existing.testRecipients, ...(emails as string[])]),
        ),
      },
      session?.user?.email ?? null,
    );

    return NextResponse.json({ cached });
  } catch (error) {
    console.error("Error sending social test:", error);
    return NextResponse.json({ error: "Failed to send test" }, { status: 500 });
  }
}
