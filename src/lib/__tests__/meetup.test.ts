import { getMeetupRsvpCount, findMeetupEventByTitle } from "@/lib/meetup";

const originalEnv = process.env;
const originalFetch = global.fetch;

beforeEach(() => {
  process.env = { ...originalEnv, MEETUP_GROUP_SLUG: "my-group" };
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function nextDataHtml(apolloState: Record<string, unknown>): string {
  const json = JSON.stringify({
    props: { pageProps: { __APOLLO_STATE__: apolloState } },
  });
  return `<html><script id="__NEXT_DATA__" type="application/json">${json}</script></html>`;
}

function htmlResponse(html: string) {
  return { ok: true, text: async () => html } as unknown as Response;
}

describe("getMeetupRsvpCount", () => {
  it("returns null when MEETUP_GROUP_SLUG is not configured", async () => {
    process.env.MEETUP_GROUP_SLUG = undefined;
    expect(await getMeetupRsvpCount("123")).toBeNull();
  });

  it("returns null when eventId is empty", async () => {
    expect(await getMeetupRsvpCount("")).toBeNull();
  });

  it("returns the RSVP count and title/dateTime from Apollo state", async () => {
    const html = nextDataHtml({
      "Event:123": {
        title: "My Event",
        dateTime: "2026-01-01T00:00:00Z",
        'rsvps({"filter":{"rsvpStatus":["YES"]}})': { totalCount: 5 },
      },
    });
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(html));
    const result = await getMeetupRsvpCount("123");
    expect(result).toMatchObject({
      count: 5,
      title: "My Event",
      dateTime: "2026-01-01T00:00:00Z",
    });
  });

  it("falls back to the recent events list for sample attendee names", async () => {
    const eventHtml = nextDataHtml({
      "Event:123": {
        title: "My Event",
        dateTime: "2026-01-01T00:00:00Z",
        'rsvps({"filter":{"rsvpStatus":["YES"]}})': { totalCount: 5 },
      },
    });
    const listHtml = nextDataHtml({
      "Event:123": {
        __typename: "Event",
        id: "123",
        title: "My Event",
        dateTime: "2026-01-01T00:00:00Z",
        going: { totalCount: 5 },
        "rsvps(YES)": {
          edges: [{ node: { __ref: "Rsvp:1" } }],
        },
        "Rsvp:1": undefined,
      },
      "Rsvp:1": { member: { __ref: "Member:1" } },
      "Member:1": { name: "Sam Attendee" },
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(htmlResponse(eventHtml))
      .mockResolvedValueOnce(htmlResponse(listHtml))
      .mockResolvedValueOnce(htmlResponse(nextDataHtml({})));

    const result = await getMeetupRsvpCount("123");
    expect(result?.sampleAttendeeNames).toEqual(["Sam Attendee"]);
  });

  it("uses direct sample attendee names without a second fetch, and falls back to empty title/dateTime when they're not strings", async () => {
    const html = nextDataHtml({
      "Event:123": {
        // no title/dateTime fields on this entry
        'rsvps({"filter":{"rsvpStatus":["YES"]}})': {
          totalCount: 3,
          edges: [{ node: { __ref: "Rsvp:1" } }],
        },
      },
      "Rsvp:1": { member: { __ref: "Member:1" } },
      "Member:1": { name: "Direct Attendee" },
    });
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(html));

    const result = await getMeetupRsvpCount("123");
    expect(result).toEqual({
      count: 3,
      title: "",
      dateTime: "",
      sampleAttendeeNames: ["Direct Attendee"],
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("filters out edges with a missing rsvp ref or a missing member ref", async () => {
    const eventHtml = nextDataHtml({
      "Event:123": {
        title: "My Event",
        dateTime: "2026-01-01T00:00:00Z",
        'rsvps({"filter":{"rsvpStatus":["YES"]}})': { totalCount: 2 },
      },
    });
    const listHtml = nextDataHtml({
      "Event:123": {
        __typename: "Event",
        id: "123",
        title: "My Event",
        dateTime: "2026-01-01T00:00:00Z",
        going: { totalCount: 2 },
        "rsvps(YES)": {
          edges: [
            { node: {} }, // no __ref -> rsvpRef undefined
            { node: { __ref: "Rsvp:1" } }, // rsvp exists but has no member ref
          ],
        },
      },
      "Rsvp:1": {},
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(htmlResponse(eventHtml))
      .mockResolvedValueOnce(htmlResponse(listHtml))
      .mockResolvedValueOnce(htmlResponse(nextDataHtml({})));

    const result = await getMeetupRsvpCount("123");
    expect(result?.sampleAttendeeNames).toEqual([]);
  });

  it("returns null when the response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    expect(await getMeetupRsvpCount("123")).toBeNull();
  });

  it("returns null when the page has no __NEXT_DATA__ block", async () => {
    global.fetch = jest.fn().mockResolvedValue(htmlResponse("<html></html>"));
    expect(await getMeetupRsvpCount("123")).toBeNull();
  });

  it("returns null when the Event entry is missing from Apollo state", async () => {
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(nextDataHtml({})));
    expect(await getMeetupRsvpCount("123")).toBeNull();
  });

  it("returns null when the YES rsvp count is missing", async () => {
    const html = nextDataHtml({ "Event:123": { title: "x" } });
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(html));
    expect(await getMeetupRsvpCount("123")).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
    expect(await getMeetupRsvpCount("123")).toBeNull();
  });

  it("aborts the request itself once the real 15s timeout fires", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            const abortError = new Error("aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        }),
    ) as unknown as typeof fetch;

    const resultPromise = getMeetupRsvpCount("123");
    jest.advanceTimersByTime(15000);
    expect(await resultPromise).toBeNull();

    jest.useRealTimers();
  });
});

describe("findMeetupEventByTitle", () => {
  const listHtml = nextDataHtml({
    "Event:1": {
      __typename: "Event",
      id: "1",
      title: "ETSA Monthly Meetup: AI Talk",
      dateTime: "2026-01-01T00:00:00Z",
      going: { totalCount: 10 },
    },
  });

  it("returns null for a blank title without fetching", async () => {
    global.fetch = jest.fn();
    expect(await findMeetupEventByTitle("   ")).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("finds an exact normalized-title match", async () => {
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(listHtml));
    const result = await findMeetupEventByTitle(
      "  ETSA Monthly Meetup: AI Talk  ",
    );
    expect(result?.id).toBe("1");
  });

  it("falls back to a loose substring match", async () => {
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(listHtml));
    const result = await findMeetupEventByTitle("AI Talk");
    expect(result?.id).toBe("1");
  });

  it("returns null when nothing matches", async () => {
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(listHtml));
    expect(await findMeetupEventByTitle("Completely Unrelated")).toBeNull();
  });

  it("returns null when MEETUP_GROUP_SLUG is not configured", async () => {
    process.env.MEETUP_GROUP_SLUG = undefined;
    global.fetch = jest.fn();
    expect(await findMeetupEventByTitle("Some Title")).toBeNull();
  });

  it("treats a non-ok events list response as no candidates", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    expect(await findMeetupEventByTitle("AI Talk")).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch Meetup"),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it("treats a missing Apollo state as no candidates", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue(htmlResponse("<html></html>"));
    expect(await findMeetupEventByTitle("AI Talk")).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch Meetup"),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it("treats a NEXT_DATA block with no Apollo state key as no candidates", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const html =
      '<html><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script></html>';
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(html));
    expect(await findMeetupEventByTitle("AI Talk")).toBeNull();
    errorSpy.mockRestore();
  });

  it("skips non-string id/title/dateTime fields and a missing going count in the events list", async () => {
    const oddHtml = nextDataHtml({
      "Event:2": {
        __typename: "Event",
        id: 2,
        title: 123,
        dateTime: null,
        // no `going` field at all - count should fall back to 0.
      },
    });
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(oddHtml));
    // The malformed fields fall back to "", and an empty normalized title is
    // a substring of everything, so this still loose-matches - but with the
    // "" fallbacks intact rather than the raw non-string values.
    const result = await findMeetupEventByTitle("AI Talk");
    expect(result).toEqual({
      id: "",
      title: "",
      dateTime: "",
      count: 0,
      sampleAttendeeNames: [],
    });
  });

  it("treats a fetch rejection as no candidates", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
    expect(await findMeetupEventByTitle("AI Talk")).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch Meetup"),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it("aborts the events-list request itself once the real 15s timeout fires", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            const abortError = new Error("aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        }),
    ) as unknown as typeof fetch;

    const resultPromise = findMeetupEventByTitle("AI Talk");
    jest.advanceTimersByTime(15000);
    expect(await resultPromise).toBeNull();

    jest.useRealTimers();
    errorSpy.mockRestore();
  });
});
