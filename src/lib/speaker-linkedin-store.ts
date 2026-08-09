import "server-only";
import { getStore } from "@netlify/blobs";

// One Netlify Blobs store, one key per normalized speaker name - captured
// once when a speaker completes their own LinkedIn OAuth connect, then
// reused on every future post that features them.
const STORE_NAME = "linkedin-speaker-urns";

interface SpeakerLinkedInRecord {
  speakerName: string;
  urn: string;
  connectedAt: string;
  connectedBy: string | null;
}

function getSpeakerLinkedInStore() {
  return getStore(STORE_NAME);
}

function speakerKey(speakerName: string): string {
  return speakerName.trim().toLowerCase();
}

export async function getSpeakerLinkedInUrn(
  speakerName: string,
): Promise<string | null> {
  const store = getSpeakerLinkedInStore();
  const record = (await store.get(speakerKey(speakerName), {
    type: "json",
  })) as SpeakerLinkedInRecord | null;
  return record?.urn ?? null;
}

export async function saveSpeakerLinkedInUrn(
  speakerName: string,
  urn: string,
  connectedBy: string | null,
): Promise<void> {
  const store = getSpeakerLinkedInStore();
  const record: SpeakerLinkedInRecord = {
    speakerName,
    urn,
    connectedAt: new Date().toISOString(),
    connectedBy,
  };
  await store.setJSON(speakerKey(speakerName), record);
}

export async function deleteSpeakerLinkedInUrn(
  speakerName: string,
): Promise<void> {
  const store = getSpeakerLinkedInStore();
  await store.delete(speakerKey(speakerName));
}
