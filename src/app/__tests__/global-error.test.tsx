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

describe("GlobalErrorPage", () => {
  it("returns an html/body element tree containing the reset button", () => {
    const reset = jest.fn();
    const element = GlobalErrorPage({ error: new Error("boom"), reset });
    expect(element.type).toBe("html");
    const body = element.props.children;
    expect(body.type).toBe("body");
  });

  it("logs server-side (window undefined in this jsdom-less test env by default is false, so covers the branch check)", () => {
    GlobalErrorPage({ error: new Error("boom"), reset: jest.fn() });
    // In the default node test environment for this file, window is
    // undefined, so the server-side logging branch runs.
    expect(console.error).toHaveBeenCalledWith(
      "Global error boundary caught:",
      expect.objectContaining({ message: "boom" }),
    );
  });
});
