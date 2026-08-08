import "server-only";
import { getStore } from "@netlify/blobs";

// One Netlify Blobs store, one key per post slug. Report contents are
// opaque to this layer - the admin UI owns the shape of `data`.
const STORE_NAME = "rsvp-reports";

export interface CachedRsvpReport {
  data: unknown;
  savedAt: string;
  savedBy: string | null;
}

function getRsvpCacheStore() {
  return getStore(STORE_NAME);
}

export async function getCachedRsvpReport(
  slug: string,
): Promise<CachedRsvpReport | null> {
  const store = getRsvpCacheStore();
  const cached = await store.get(slug, { type: "json" });
  return (cached as CachedRsvpReport | null) ?? null;
}

export async function saveCachedRsvpReport(
  slug: string,
  data: unknown,
  savedBy: string | null,
): Promise<CachedRsvpReport> {
  const store = getRsvpCacheStore();
  const report: CachedRsvpReport = {
    data,
    savedAt: new Date().toISOString(),
    savedBy,
  };
  await store.setJSON(slug, report);
  return report;
}
