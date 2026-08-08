import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getProvider } from "@/lib/social";
import { getPublishedPostFrontmatter } from "@/lib/social/post-data";
import {
  getCachedSocialRecord,
  saveCachedSocialRecord,
} from "@/lib/social-cache";

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

    const { confirm } = (await request.json()) as { confirm?: unknown };
    const { title } = await getPublishedPostFrontmatter(slug);
    if (confirm !== title) {
      return NextResponse.json(
        { error: "Confirmation text does not match the post title" },
        { status: 400 },
      );
    }

    const existing = await getCachedSocialRecord(slug, providerName);
    if (!existing?.campaignId) {
      return NextResponse.json(
        { error: "No draft campaign exists yet - create one first" },
        { status: 400 },
      );
    }

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
