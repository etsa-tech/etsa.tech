import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getProvider } from "@/lib/social";
import type { SocialProvider } from "@/lib/social";
import { getCachedSocialRecord } from "@/lib/social-cache";
import type { SocialCacheRecord } from "@/types/social";

export interface SocialRouteContext {
  session: Session | null;
  slug: string;
  providerName: string;
  provider: SocialProvider;
}

// Every route under /api/admin/posts/[slug]/social/[provider]/ starts with
// the same two guard clauses: an authorized session, and a provider name
// that actually resolves. Shared here so each route only contains its own
// distinct logic.
export async function resolveSocialRoute(
  params: Promise<{ slug: string; provider: string }>,
): Promise<SocialRouteContext | NextResponse> {
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

  return { session, slug, providerName, provider };
}

// test/route.ts and send/route.ts both require a draft to already exist
// before they can act on its campaignId. campaignId is narrowed to string
// in the return type so callers don't need a non-null assertion.
export async function requireDraftedCampaign(
  slug: string,
  providerName: string,
): Promise<(SocialCacheRecord & { campaignId: string }) | NextResponse> {
  const existing = await getCachedSocialRecord(slug, providerName);
  if (!existing?.campaignId) {
    return NextResponse.json(
      { error: "No draft campaign exists yet - create one first" },
      { status: 400 },
    );
  }
  return { ...existing, campaignId: existing.campaignId };
}
