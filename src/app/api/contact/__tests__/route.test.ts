import { NextRequest } from "next/server";
import { validateContactForm } from "@/lib/validation";
import { sendContactEmail } from "@/lib/server-only-email";
import { validateCaptcha } from "@/lib/api-utils";
import { POST, OPTIONS } from "../route";

jest.mock("@/lib/validation", () => ({ validateContactForm: jest.fn() }));
jest.mock("@/lib/server-only-email", () => ({ sendContactEmail: jest.fn() }));
jest.mock("@/lib/api-utils", () => {
  const actual = jest.requireActual("@/lib/api-utils");
  return { ...actual, validateCaptcha: jest.fn() };
});

const mockedValidateContactForm = jest.mocked(validateContactForm);
const mockedSendContactEmail = jest.mocked(sendContactEmail);
const mockedValidateCaptcha = jest.mocked(validateCaptcha);

const validFormData = {
  name: "Jane",
  email: "jane@example.com",
  subject: "Hello there",
  message: "This is a long enough message.",
  "h-captcha-response": "tok",
};

function postReq(body: unknown, origin = "https://etsa.tech") {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockedValidateContactForm.mockReturnValue({
    success: true,
    data: validFormData,
  });
  mockedValidateCaptcha.mockResolvedValue(undefined);
  mockedSendContactEmail.mockResolvedValue({ success: true });
});

afterEach(() => jest.clearAllMocks());

describe("POST /api/contact", () => {
  it("sends the email and returns success", async () => {
    const res = await POST(postReq(validFormData));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mockedSendContactEmail).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Jane", hostname: expect.any(String) }),
    );
  });

  it("400s when validation fails", async () => {
    mockedValidateContactForm.mockReturnValue({
      success: false,
      errors: { name: ["required"] },
    });
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mockedSendContactEmail).not.toHaveBeenCalled();
  });

  it("propagates a captcha failure as a 500 via the generic handler", async () => {
    mockedValidateCaptcha.mockRejectedValue(new Error("bad captcha"));
    const res = await POST(postReq(validFormData));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("bad captcha");
  });

  it("throws when the email fails to send", async () => {
    mockedSendContactEmail.mockResolvedValue({
      success: false,
      error: "smtp down",
    });
    const res = await POST(postReq(validFormData));
    expect(res.status).toBe(500);
  });

  it("rejects non-POST methods via createApiHandler", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/contact", { method: "GET" }),
    );
    expect(res.status).toBe(405);
  });
});

describe("OPTIONS /api/contact", () => {
  it("handles CORS preflight", async () => {
    const res = await OPTIONS(
      new NextRequest("http://localhost/api/contact", {
        method: "OPTIONS",
        headers: { origin: "https://etsa.tech" },
      }),
    );
    expect(res.status).toBe(200);
  });
});
