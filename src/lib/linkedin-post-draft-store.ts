import "server-only";
import { getStore } from "@netlify/blobs";

// One Netlify Blobs store, one key per post slug - holds an admin's manual
// edits to the auto-generated LinkedIn post text, so they can review/tweak
// the wording before it actually goes out. If nothing's been saved, the
// post callback falls back to the auto-generated template.
const STORE_NAME = "linkedin-post-drafts";

interface DraftRecord {
  commentary: string;
  updatedAt: string;
  updatedBy: string | null;
}

function getDraftStore() {
  return getStore(STORE_NAME);
}

export async function getLinkedInPostDraft(
  slug: string,
): Promise<string | null> {
  const store = getDraftStore();
  const record = (await store.get(slug, {
    type: "json",
  })) as DraftRecord | null;
  return record?.commentary ?? null;
}

export async function saveLinkedInPostDraft(
  slug: string,
  commentary: string,
  updatedBy: string | null,
): Promise<void> {
  const store = getDraftStore();
  const record: DraftRecord = {
    commentary,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await store.setJSON(slug, record);
}

export async function deleteLinkedInPostDraft(slug: string): Promise<void> {
  const store = getDraftStore();
  await store.delete(slug);
}
