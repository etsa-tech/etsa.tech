const store = new Map<string, unknown>();

jest.mock("@netlify/blobs", () => ({
  getStore: jest.fn(() => ({
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    setJSON: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  })),
}));

import {
  getCachedSocialRecord,
  saveCachedSocialRecord,
} from "@/lib/social-cache";

beforeEach(() => {
  store.clear();
});

describe("social-cache", () => {
  it("returns null when nothing is cached", async () => {
    expect(await getCachedSocialRecord("slug", "mailchimp")).toBeNull();
  });

  it("creates a fresh record with sensible defaults on first save", async () => {
    const record = await saveCachedSocialRecord(
      "slug",
      "mailchimp",
      { campaignId: "c1" },
      "organizer@etsa.tech",
    );
    expect(record).toMatchObject({
      provider: "mailchimp",
      campaignId: "c1",
      campaignUrl: null,
      status: "draft",
      testRecipients: [],
      sentAt: null,
      sentBy: null,
      updatedBy: "organizer@etsa.tech",
    });
    expect(typeof record.updatedAt).toBe("string");
  });

  it("merges updates onto an existing record and namespaces by slug:provider", async () => {
    await saveCachedSocialRecord(
      "slug",
      "mailchimp",
      { campaignId: "c1", status: "draft" },
      "a@etsa.tech",
    );
    const updated = await saveCachedSocialRecord(
      "slug",
      "mailchimp",
      { status: "tested", testRecipients: ["r@example.com"] },
      "b@etsa.tech",
    );
    expect(updated.campaignId).toBe("c1");
    expect(updated.status).toBe("tested");
    expect(updated.testRecipients).toEqual(["r@example.com"]);

    const other = await getCachedSocialRecord("slug", "linkedin");
    expect(other).toBeNull();
  });
});
