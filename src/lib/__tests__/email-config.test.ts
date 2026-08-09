import nodemailer from "nodemailer";
import { createTransporter, verifyHCaptcha } from "@/lib/email-config";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ mocked: true })),
}));

const originalEnv = process.env;
const originalFetch = global.fetch;

const smtpEnv = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USERNAME: "user",
  SMTP_PASSWORD: "pass",
  SMTP_FROM: "from@example.com",
  SMTP_TO: "to@example.com",
  SMTP_TLS: "true",
};

beforeEach(() => {
  process.env = { ...originalEnv, ...smtpEnv };
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("createTransporter", () => {
  it("builds a transport with secure=true when TLS and port 465", () => {
    process.env.SMTP_PORT = "465";
    createTransporter();
    expect(jest.mocked(nodemailer.createTransport)).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true, host: "smtp.example.com" }),
    );
  });

  it("defaults to secure=false on the standard 587 port", () => {
    createTransporter();
    expect(jest.mocked(nodemailer.createTransport)).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false }),
    );
  });

  it("defaults the port to 587 when SMTP_PORT is unset", () => {
    delete process.env.SMTP_PORT;
    createTransporter();
    expect(jest.mocked(nodemailer.createTransport)).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false }),
    );
  });

  it.each([
    "SMTP_HOST",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "SMTP_FROM",
    "SMTP_TO",
  ])("throws when %s is missing", (key) => {
    delete process.env[key];
    expect(() => createTransporter()).toThrow(new RegExp(key));
  });
});

describe("verifyHCaptcha", () => {
  beforeEach(() => {
    process.env.HCAPTCHA_SECRET_KEY = "secret";
  });

  it("returns success when hCaptcha approves the token", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
    expect(await verifyHCaptcha("token")).toEqual({ success: true });
  });

  it("returns failure when hCaptcha rejects the token", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false }),
    }) as unknown as typeof fetch;
    const result = await verifyHCaptcha("token");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/verification failed/i);
  });

  it("returns a config error when HCAPTCHA_SECRET_KEY is missing", async () => {
    delete process.env.HCAPTCHA_SECRET_KEY;
    const result = await verifyHCaptcha("token");
    expect(result.success).toBe(false);
  });

  it("returns an error when fetch throws a generic error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("boom"));
    const result = await verifyHCaptcha("token");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/verification error/i);
  });

  it("surfaces a timeout-specific message on AbortError", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    global.fetch = jest.fn().mockRejectedValue(abortError);
    const result = await verifyHCaptcha("token");
    expect(result.success).toBe(false);
  });

  it("aborts the request itself once the real timeout fires", async () => {
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

    const resultPromise = verifyHCaptcha("token");
    jest.advanceTimersByTime(10000);
    const result = await resultPromise;

    expect(result.success).toBe(false);
    jest.useRealTimers();
  });
});
