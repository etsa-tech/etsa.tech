const store = new Map<string, unknown>();

jest.mock("@netlify/blobs", () => ({
  getStore: jest.fn(() => ({
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    setJSON: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  })),
}));

import { getCachedRsvpReport, saveCachedRsvpReport } from "@/lib/rsvp-cache";

beforeEach(() => {
  store.clear();
});

describe("rsvp-cache", () => {
  it("returns null when nothing is cached", async () => {
    expect(await getCachedRsvpReport("no-such-slug")).toBeNull();
  });

  it("saves and reads back a report", async () => {
    const saved = await saveCachedRsvpReport(
      "my-slug",
      { attendees: 5 },
      "organizer@etsa.tech",
    );
    expect(saved.data).toEqual({ attendees: 5 });
    expect(saved.savedBy).toBe("organizer@etsa.tech");
    expect(typeof saved.savedAt).toBe("string");

    const cached = await getCachedRsvpReport("my-slug");
    expect(cached).toEqual(saved);
  });

  it("allows a null savedBy", async () => {
    const saved = await saveCachedRsvpReport(
      "anon-slug",
      { attendees: 1 },
      null,
    );
    expect(saved.savedBy).toBeNull();
  });
});
