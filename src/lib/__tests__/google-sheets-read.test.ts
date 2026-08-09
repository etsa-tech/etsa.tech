import { getSheetRsvpsForEvent } from "@/lib/google-sheets-read";

const originalEnv = process.env;
const originalFetch = global.fetch;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    GOOGLE_SHEETS_WEBHOOK_URL: "https://script.example/webhook",
  };
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("getSheetRsvpsForEvent", () => {
  it("returns an empty array when the webhook URL is not configured", async () => {
    process.env = { ...originalEnv, GOOGLE_SHEETS_WEBHOOK_URL: undefined };
    expect(await getSheetRsvpsForEvent("My Event")).toEqual([]);
  });

  it("returns an empty array when eventTitle is empty", async () => {
    expect(await getSheetRsvpsForEvent("")).toEqual([]);
  });

  it("filters to rows where canAttend starts with yes, case-insensitively", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rows: [
          { canAttend: "Yes", email: "a@example.com" },
          { canAttend: "Yes, I'll be there", email: "b@example.com" },
          { canAttend: "No", email: "c@example.com" },
          { canAttend: "Maybe", email: "d@example.com" },
        ],
      }),
    }) as unknown as typeof fetch;

    const rows = await getSheetRsvpsForEvent("My Event");
    expect(rows.map((r) => r.email)).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("returns an empty array when the response is not ok", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    expect(await getSheetRsvpsForEvent("My Event")).toEqual([]);
  });

  it("returns an empty array when rows is missing from the response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    expect(await getSheetRsvpsForEvent("My Event")).toEqual([]);
  });

  it("returns an empty array when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
    expect(await getSheetRsvpsForEvent("My Event")).toEqual([]);
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

    const resultPromise = getSheetRsvpsForEvent("My Event");
    await jest.advanceTimersByTimeAsync(15000);
    expect(await resultPromise).toEqual([]);

    jest.useRealTimers();
  });
});
