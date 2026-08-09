const store = new Map<string, unknown>();

jest.mock("@netlify/blobs", () => ({
  getStore: jest.fn(() => ({
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    setJSON: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    delete: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  })),
}));

import {
  deleteSpeakerLinkedInUrn,
  getSpeakerLinkedInUrn,
  saveSpeakerLinkedInUrn,
} from "@/lib/speaker-linkedin-store";

beforeEach(() => {
  store.clear();
});

describe("speaker-linkedin-store", () => {
  it("returns null when no urn is stored for a speaker", async () => {
    expect(await getSpeakerLinkedInUrn("Jane Doe")).toBeNull();
  });

  it("saves and retrieves a urn, normalized by name", async () => {
    await saveSpeakerLinkedInUrn(
      "Jane Doe",
      "member-123",
      "organizer@etsa.tech",
    );
    expect(await getSpeakerLinkedInUrn("  jane doe  ")).toBe("member-123");
  });

  it("overwrites a previously stored urn", async () => {
    await saveSpeakerLinkedInUrn("Jane Doe", "member-123", "a@etsa.tech");
    await saveSpeakerLinkedInUrn("Jane Doe", "member-456", "b@etsa.tech");
    expect(await getSpeakerLinkedInUrn("Jane Doe")).toBe("member-456");
  });

  it("keeps distinct speakers namespaced separately", async () => {
    await saveSpeakerLinkedInUrn("Jane Doe", "member-123", null);
    expect(await getSpeakerLinkedInUrn("John Smith")).toBeNull();
  });

  it("deletes a stored urn, normalized by name", async () => {
    await saveSpeakerLinkedInUrn("Jane Doe", "member-123", null);
    await deleteSpeakerLinkedInUrn("  JANE DOE  ");
    expect(await getSpeakerLinkedInUrn("Jane Doe")).toBeNull();
  });

  it("does not error when deleting a speaker with nothing stored", async () => {
    await expect(deleteSpeakerLinkedInUrn("Nobody")).resolves.toBeUndefined();
  });
});
