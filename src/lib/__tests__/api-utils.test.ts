import { NextRequest } from "next/server";
import { verifyHCaptcha } from "@/lib/email-config";
import {
  getCorsHeaders,
  CORS_HEADERS,
  NO_CACHE_HEADERS,
  API_HEADERS_NO_CACHE,
  handleOptions,
  createErrorResponse,
  createSuccessResponse,
  createSuccessResponseNoCache,
  createErrorResponseNoCache,
  parseRequestBody,
  validateCaptcha,
  createApiHandler,
  logRequestData,
  logError,
  createSafeErrorResponse,
} from "@/lib/api-utils";

jest.mock("@/lib/email-config", () => ({ verifyHCaptcha: jest.fn() }));
const mockedVerifyHCaptcha = jest.mocked(verifyHCaptcha);

const originalEnv = process.env;
const originalNodeEnv = process.env.NODE_ENV;

// @types/node types NODE_ENV as a readonly property; these tests still need
// to flip it per-case to exercise createErrorResponse's prod/dev branching.
function setNodeEnv(value: string) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  process.env = originalEnv;
  setNodeEnv(originalNodeEnv ?? "test");
  jest.clearAllMocks();
});

describe("getCorsHeaders", () => {
  it("echoes back an exact-match allowed origin", () => {
    expect(
      getCorsHeaders("https://etsa.tech")["Access-Control-Allow-Origin"],
    ).toBe("https://etsa.tech");
  });

  it("allows a Netlify deploy preview origin", () => {
    const origin = "https://deploy-preview-42-etsa-tech.netlify.app";
    expect(getCorsHeaders(origin)["Access-Control-Allow-Origin"]).toBe(origin);
  });

  it("allows a Netlify branch deploy origin", () => {
    const origin = "https://my-branch--etsa-tech.netlify.app";
    expect(getCorsHeaders(origin)["Access-Control-Allow-Origin"]).toBe(origin);
  });

  it("returns null for a disallowed origin", () => {
    expect(
      getCorsHeaders("https://evil.example")["Access-Control-Allow-Origin"],
    ).toBe("null");
  });

  it("returns null when origin is null", () => {
    expect(getCorsHeaders(null)["Access-Control-Allow-Origin"]).toBe("null");
  });
});

describe("static header exports", () => {
  it("CORS_HEADERS allows all origins", () => {
    expect(CORS_HEADERS["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("NO_CACHE_HEADERS disables caching", () => {
    expect(NO_CACHE_HEADERS["Cache-Control"]).toMatch(/no-store/);
  });

  it("API_HEADERS_NO_CACHE merges both", () => {
    expect(API_HEADERS_NO_CACHE["Access-Control-Allow-Origin"]).toBe("*");
    expect(API_HEADERS_NO_CACHE["Cache-Control"]).toMatch(/no-store/);
  });
});

describe("handleOptions", () => {
  it("returns a 200 with CORS headers for the request origin", async () => {
    const req = new NextRequest("http://localhost/api/x", {
      headers: { origin: "https://etsa.tech" },
    });
    const res = handleOptions(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://etsa.tech",
    );
  });
});

describe("createErrorResponse / createSuccessResponse", () => {
  it("createErrorResponse returns the message and status in development", async () => {
    setNodeEnv("development");
    const res = createErrorResponse("Something broke", 418);
    expect(res.status).toBe(418);
    expect((await res.json()).error).toBe("Something broke");
  });

  it("createErrorResponse sanitizes the message in production for a known status", async () => {
    setNodeEnv("production");
    const res = createErrorResponse("Detailed internal info", 404);
    expect((await res.json()).error).toBe("Not found");
  });

  it("createErrorResponse falls back to a generic message for an unmapped status in production", async () => {
    setNodeEnv("production");
    const res = createErrorResponse("Detailed internal info", 599);
    expect((await res.json()).error).toBe("An error occurred");
  });

  it("createSuccessResponse includes CORS headers for a given origin", () => {
    const res = createSuccessResponse({ ok: true }, "https://etsa.tech");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://etsa.tech",
    );
  });

  it("createErrorResponse defaults status to 400", async () => {
    const res = createErrorResponse("oops");
    expect(res.status).toBe(400);
  });

  it("createErrorResponse uses origin-specific CORS headers when given an origin", () => {
    const res = createErrorResponse("oops", 400, "https://etsa.tech");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://etsa.tech",
    );
  });

  it("createSuccessResponseNoCache adds no-cache headers", () => {
    const res = createSuccessResponseNoCache({ ok: true });
    expect(res.headers.get("Cache-Control")).toMatch(/no-store/);
  });

  it("createSuccessResponseNoCache uses origin-specific CORS headers when given an origin", () => {
    const res = createSuccessResponseNoCache({ ok: true }, "https://etsa.tech");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://etsa.tech",
    );
  });

  it("createErrorResponseNoCache adds no-cache headers", async () => {
    setNodeEnv("development");
    const res = createErrorResponseNoCache("oops", 400);
    expect(res.headers.get("Cache-Control")).toMatch(/no-store/);
    expect((await res.json()).error).toBe("oops");
  });

  it("createErrorResponseNoCache defaults status to 400", () => {
    const res = createErrorResponseNoCache("oops");
    expect(res.status).toBe(400);
  });

  it("createErrorResponseNoCache sanitizes the message in production", async () => {
    setNodeEnv("production");
    const res = createErrorResponseNoCache("Detailed internal info", 404);
    expect((await res.json()).error).toBe("Not found");
  });

  it("createErrorResponseNoCache uses origin-specific CORS headers when given an origin", () => {
    const res = createErrorResponseNoCache("oops", 400, "https://etsa.tech");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://etsa.tech",
    );
  });
});

describe("parseRequestBody", () => {
  it("returns the parsed body", async () => {
    const req = new NextRequest("http://localhost/api/x", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });
    expect(await parseRequestBody(req)).toEqual({ a: 1 });
  });

  it("throws when the body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/x", {
      method: "POST",
      body: "not-json",
    });
    await expect(parseRequestBody(req)).rejects.toThrow(/Invalid JSON/);
  });

  it("throws when the parsed body is falsy", async () => {
    const req = new NextRequest("http://localhost/api/x", {
      method: "POST",
      body: "null",
    });
    await expect(parseRequestBody(req)).rejects.toThrow(/Invalid JSON/);
  });
});

describe("validateCaptcha", () => {
  it("throws when no token is provided", async () => {
    await expect(validateCaptcha("")).rejects.toThrow(
      /Captcha token is required/,
    );
  });

  it("resolves when hCaptcha verification succeeds", async () => {
    mockedVerifyHCaptcha.mockResolvedValue({ success: true });
    await expect(validateCaptcha("tok")).resolves.toBeUndefined();
  });

  it("throws the hCaptcha error message on failure", async () => {
    mockedVerifyHCaptcha.mockResolvedValue({
      success: false,
      error: "bad captcha",
    });
    await expect(validateCaptcha("tok")).rejects.toThrow("bad captcha");
  });

  it("throws a generic message when hCaptcha fails without an error string", async () => {
    mockedVerifyHCaptcha.mockResolvedValue({ success: false });
    await expect(validateCaptcha("tok")).rejects.toThrow(
      /Captcha verification failed/,
    );
  });
});

describe("createApiHandler", () => {
  it("handles OPTIONS as a CORS preflight", async () => {
    const wrapped = createApiHandler(jest.fn());
    const req = new NextRequest("http://localhost/api/x", {
      method: "OPTIONS",
    });
    const res = await wrapped(req);
    expect(res.status).toBe(200);
  });

  it("rejects non-POST methods", async () => {
    const wrapped = createApiHandler(jest.fn());
    const req = new NextRequest("http://localhost/api/x", { method: "GET" });
    const res = await wrapped(req);
    expect(res.status).toBe(405);
  });

  it("invokes the handler for POST and returns its response", async () => {
    const handler = jest
      .fn()
      .mockResolvedValue(createSuccessResponse({ ok: true }));
    const wrapped = createApiHandler(handler);
    const req = new NextRequest("http://localhost/api/x", { method: "POST" });
    const res = await wrapped(req);
    expect(handler).toHaveBeenCalled();
    expect((await res.json()).ok).toBe(true);
  });

  it("catches handler errors and returns a 500", async () => {
    const handler = jest.fn().mockRejectedValue(new Error("boom"));
    const wrapped = createApiHandler(handler);
    const req = new NextRequest("http://localhost/api/x", { method: "POST" });
    const res = await wrapped(req);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("boom");
  });

  it("uses a generic message when a non-Error is thrown", async () => {
    const handler = jest.fn().mockRejectedValue("not an error object");
    const wrapped = createApiHandler(handler);
    const req = new NextRequest("http://localhost/api/x", { method: "POST" });
    const res = await wrapped(req);
    expect((await res.json()).error).toBe("Internal server error");
  });
});

describe("logRequestData", () => {
  it("masks the captcha token but leaves other fields intact", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    logRequestData({ name: "Jane", captchaToken: "secret" }, "/api/contact");
    expect(spy).toHaveBeenCalledWith(
      "/api/contact request received:",
      expect.objectContaining({ name: "Jane", captchaToken: "[PRESENT]" }),
    );
    spy.mockRestore();
  });

  it("marks a missing captcha token", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    logRequestData({ name: "Jane" }, "/api/contact");
    expect(spy).toHaveBeenCalledWith(
      "/api/contact request received:",
      expect.objectContaining({ captchaToken: "[MISSING]" }),
    );
    spy.mockRestore();
  });
});

describe("logError", () => {
  it("logs a structured error with an Error instance", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    logError(new Error("boom"), "context", { extra: 1 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("logs a structured error for a non-Error value", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    logError("plain string error", "context");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("createSafeErrorResponse", () => {
  it("returns the real message outside production", async () => {
    setNodeEnv("development");
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = createSafeErrorResponse(new Error("detailed"), "ctx");
    expect((await res.json()).error).toBe("detailed");
  });

  it("returns a generic 'Unknown error' message outside production for a non-Error throw", async () => {
    setNodeEnv("development");
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = createSafeErrorResponse("plain string error", "ctx");
    expect((await res.json()).error).toBe("Unknown error");
  });

  it("returns a generic message in production", async () => {
    setNodeEnv("production");
    jest.spyOn(console, "error").mockImplementation(() => {});
    // createSafeErrorResponse's own "An error occurred" placeholder is then
    // re-sanitized by createErrorResponse for the 500 status, which maps to
    // "Internal server error" instead.
    const res = createSafeErrorResponse(new Error("detailed"), "ctx");
    expect((await res.json()).error).toBe("Internal server error");
  });
});
