import { NextRequest } from "next/server";
import { validateRSVPForm } from "@/lib/validation";
import { validateCaptcha } from "@/lib/api-utils";
import { POST, OPTIONS } from "../route";

jest.mock("@/lib/validation", () => ({ validateRSVPForm: jest.fn() }));
jest.mock("@/lib/api-utils", () => {
  const actual = jest.requireActual("@/lib/api-utils");
  return { ...actual, validateCaptcha: jest.fn() };
});

const mockedValidateRSVPForm = jest.mocked(validateRSVPForm);
const mockedValidateCaptcha = jest.mocked(validateCaptcha);

const originalEnv = process.env;
const originalFetch = global.fetch;

const validRsvpData = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  canAttend: "Yes" as const,
  howDidYouHear: "Meetup",
  comments: "",
  subscribeToNewsletter: false,
  saveDataForNextTime: false,
  meetingDate: "2026-01-01",
};

function postReq(body: unknown, origin = "https://etsa.tech") {
  return new NextRequest("http://localhost/api/rsvp", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env = {
    ...originalEnv,
    GOOGLE_SHEETS_WEBHOOK_URL: "https://script.example/x",
  };
  mockedValidateRSVPForm.mockReturnValue({
    success: true,
    data: validRsvpData,
  });
  mockedValidateCaptcha.mockResolvedValue(undefined);
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("POST /api/rsvp", () => {
  it("submits to Google Sheets and returns success", async () => {
    const res = await POST(postReq({ ...validRsvpData, captchaToken: "tok" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://script.example/x",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("defaults the event name to 'ETSA Meetup' when meetingTitle is absent", async () => {
    await POST(postReq({ ...validRsvpData, captchaToken: "tok" }));
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.event).toBe("ETSA Meetup");
  });

  it("400s when validation fails", async () => {
    mockedValidateRSVPForm.mockReturnValue({
      success: false,
      errors: { firstName: ["required"] },
    });
    const res = await POST(postReq({ captchaToken: "tok" }));
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("throws when the Google Sheets webhook URL isn't configured", async () => {
    process.env.GOOGLE_SHEETS_WEBHOOK_URL = undefined;
    const res = await POST(postReq({ ...validRsvpData, captchaToken: "tok" }));
    expect(res.status).toBe(500);
  });

  it("throws when the Sheets webhook returns a non-ok response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    const res = await POST(postReq({ ...validRsvpData, captchaToken: "tok" }));
    expect(res.status).toBe(500);
  });

  it("throws when the Sheets response body carries an error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "sheet is full" }),
    }) as unknown as typeof fetch;
    const res = await POST(postReq({ ...validRsvpData, captchaToken: "tok" }));
    expect(res.status).toBe(500);
  });

  it("surfaces a timeout-specific error when the Sheets fetch aborts", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    global.fetch = jest.fn().mockRejectedValue(abortError);
    const res = await POST(postReq({ ...validRsvpData, captchaToken: "tok" }));
    expect(res.status).toBe(500);
  });

  it("falls back to a generic message when a non-Error value is thrown", async () => {
    global.fetch = jest.fn().mockRejectedValue("not an Error instance");
    const res = await POST(postReq({ ...validRsvpData, captchaToken: "tok" }));
    expect(res.status).toBe(500);
  });
});

describe("OPTIONS /api/rsvp", () => {
  it("handles CORS preflight", async () => {
    const res = await OPTIONS(
      new NextRequest("http://localhost/api/rsvp", {
        method: "OPTIONS",
        headers: { origin: "https://etsa.tech" },
      }),
    );
    expect(res.status).toBe(200);
  });
});
