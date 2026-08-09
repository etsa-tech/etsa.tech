/**
 * @jest-environment jsdom
 *
 * Separate from global-error.test.tsx (default node env, no `window`) so we
 * can also exercise the client-side (window defined) logging branches,
 * which require jsdom.
 */
import GlobalErrorPage from "@/app/global-error";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

function setNodeEnv(value: string) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
  });
}

describe("GlobalErrorPage client-side logging", () => {
  it("logs to the console in development when window is defined", () => {
    setNodeEnv("development");
    GlobalErrorPage({ error: new Error("boom"), reset: jest.fn() });
    expect(console.error).toHaveBeenCalledWith("Global error:", "boom");
  });

  it("does not log to the client console outside development", () => {
    setNodeEnv("production");
    GlobalErrorPage({ error: new Error("boom"), reset: jest.fn() });
    expect(console.error).not.toHaveBeenCalled();
  });
});
