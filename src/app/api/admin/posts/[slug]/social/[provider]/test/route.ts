import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getProvider } from "@/lib/social";
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

    const { emails } = (await request.json()) as { emails?: unknown };
    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "At least one test recipient email is required" },
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

    await provider.sendTest(existing.campaignId, emails as string[]);

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
