import { NextRequest } from "next/server";
import { POST, OPTIONS } from "../route";

const originalEnv = process.env;
const originalFetch = global.fetch;

function postReq(body: unknown, origin = "https://etsa.tech") {
  return new NextRequest("http://localhost/api/mailchimp-subscribe", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env = {
    ...originalEnv,
    MAILCHIMP_API_KEY: "key",
    MAILCHIMP_LIST_ID: "list1",
    MAILCHIMP_SERVER_PREFIX: "us1",
  };
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("POST /api/mailchimp-subscribe", () => {
  it("subscribes a new member and returns success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "1",
        email_address: "jane@example.com",
        status: "subscribed",
        merge_fields: {},
      }),
    }) as unknown as typeof fetch;

    const res = await POST(
      postReq({ email: "jane@example.com", name: "Jane Doe" }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.merge_fields).toEqual({ FNAME: "Jane", LNAME: "Doe" });
  });

  it("treats an already-subscribed member as success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ title: "Member Exists" }),
    }) as unknown as typeof fetch;

    const res = await POST(
      postReq({ email: "jane@example.com", name: "Jane" }),
    );
    expect(res.status).toBe(200);
  });

  it("400s when email or name is missing", async () => {
    const res = await POST(postReq({ email: "jane@example.com" }));
    expect(res.status).toBe(400);
  });

  it("400s for an invalid email format", async () => {
    const res = await POST(postReq({ email: "not-an-email", name: "Jane" }));
    expect(res.status).toBe(400);
  });

  it("throws when Mailchimp config is missing", async () => {
    process.env.MAILCHIMP_API_KEY = undefined;
    const res = await POST(
      postReq({ email: "jane@example.com", name: "Jane" }),
    );
    expect(res.status).toBe(500);
  });

  it("throws a detailed error when the Mailchimp API rejects the request", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Invalid list", title: "Invalid Resource" }),
    }) as unknown as typeof fetch;
    const res = await POST(
      postReq({ email: "jane@example.com", name: "Jane" }),
    );
    expect(res.status).toBe(500);
  });

  it("surfaces a timeout-specific error when the Mailchimp fetch aborts", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    global.fetch = jest.fn().mockRejectedValue(abortError);
    const res = await POST(
      postReq({ email: "jane@example.com", name: "Jane" }),
    );
    expect(res.status).toBe(500);
  });

  it("falls back to a generic message when a non-Error value is thrown", async () => {
    global.fetch = jest.fn().mockRejectedValue("not an Error instance");
    const res = await POST(
      postReq({ email: "jane@example.com", name: "Jane" }),
    );
    expect(res.status).toBe(500);
  });

  it("falls back to a status-based message when the API error has no detail", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ title: "Invalid Resource" }),
    }) as unknown as typeof fetch;
    const res = await POST(
      postReq({ email: "jane@example.com", name: "Jane" }),
    );
    expect(res.status).toBe(500);
  });

  it("falls back to an empty first name for a whitespace-only name", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    await POST(postReq({ email: "jane@example.com", name: " " }));
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.merge_fields).toEqual({ FNAME: "", LNAME: "" });
  });

  it("handles a single-word name with no last name", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    await POST(postReq({ email: "jane@example.com", name: "Cher" }));
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.merge_fields).toEqual({ FNAME: "Cher", LNAME: "" });
  });
});

describe("OPTIONS /api/mailchimp-subscribe", () => {
  it("handles CORS preflight", async () => {
    const res = await OPTIONS(
      new NextRequest("http://localhost/x", {
        method: "OPTIONS",
        headers: { origin: "https://etsa.tech" },
      }),
    );
    expect(res.status).toBe(200);
  });
});
