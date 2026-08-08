import "server-only";
import { getStore } from "@netlify/blobs";
import type { SocialCacheRecord } from "@/types/social";

// One Netlify Blobs store, one key per "slug:provider" pair - mirrors
// rsvp-cache.ts. This is the audit trail a live send is gated on: send is
// refused unless the cached record already shows a completed test send.
const STORE_NAME = "social-mailings";

function getSocialCacheStore() {
  return getStore(STORE_NAME);
}

function cacheKey(slug: string, provider: string): string {
  return `${slug}:${provider}`;
}

export async function getCachedSocialRecord(
  slug: string,
  provider: string,
): Promise<SocialCacheRecord | null> {
  const store = getSocialCacheStore();
  const cached = await store.get(cacheKey(slug, provider), { type: "json" });
  return (cached as SocialCacheRecord | null) ?? null;
}

export async function saveCachedSocialRecord(
  slug: string,
  provider: string,
  updates: Partial<SocialCacheRecord>,
  updatedBy: string | null,
): Promise<SocialCacheRecord> {
  const existing = await getCachedSocialRecord(slug, provider);

  const record: SocialCacheRecord = {
    provider,
    campaignId: existing?.campaignId ?? null,
    campaignUrl: existing?.campaignUrl ?? null,
    status: existing?.status ?? "draft",
    testRecipients: existing?.testRecipients ?? [],
    sentAt: existing?.sentAt ?? null,
    sentBy: existing?.sentBy ?? null,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  const store = getSocialCacheStore();
  await store.setJSON(cacheKey(slug, provider), record);
  return record;
}
