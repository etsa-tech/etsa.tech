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
  deleteLinkedInPostDraft,
  getLinkedInPostDraft,
  saveLinkedInPostDraft,
} from "@/lib/linkedin-post-draft-store";

beforeEach(() => {
  store.clear();
});

describe("linkedin-post-draft-store", () => {
  it("returns null when no draft is stored for a slug", async () => {
    expect(await getLinkedInPostDraft("my-talk")).toBeNull();
  });

  it("saves and retrieves a draft by slug", async () => {
    await saveLinkedInPostDraft(
      "my-talk",
      "Edited text",
      "organizer@etsa.tech",
    );
    expect(await getLinkedInPostDraft("my-talk")).toBe("Edited text");
  });

  it("overwrites a previously saved draft", async () => {
    await saveLinkedInPostDraft("my-talk", "First", "a@etsa.tech");
    await saveLinkedInPostDraft("my-talk", "Second", "b@etsa.tech");
    expect(await getLinkedInPostDraft("my-talk")).toBe("Second");
  });

  it("keeps distinct slugs namespaced separately", async () => {
    await saveLinkedInPostDraft("my-talk", "Text", null);
    expect(await getLinkedInPostDraft("other-talk")).toBeNull();
  });

  it("deletes a stored draft", async () => {
    await saveLinkedInPostDraft("my-talk", "Text", null);
    await deleteLinkedInPostDraft("my-talk");
    expect(await getLinkedInPostDraft("my-talk")).toBeNull();
  });

  it("does not error when deleting a slug with nothing stored", async () => {
    await expect(
      deleteLinkedInPostDraft("nothing-here"),
    ).resolves.toBeUndefined();
  });
});
