import tokenBlocklist from "@/lib/token-blocklist";

afterEach(() => {
  tokenBlocklist.clear();
});

afterAll(() => {
  tokenBlocklist.stopCleanup();
});

describe("tokenBlocklist", () => {
  it("is not blocked before being added", () => {
    expect(tokenBlocklist.isBlocked("unknown-jti")).toBe(false);
  });

  it("blocks a token after it's added", () => {
    tokenBlocklist.add("jti-1", Date.now() + 10_000, "person@etsa.tech");
    expect(tokenBlocklist.isBlocked("jti-1")).toBe(true);
    expect(tokenBlocklist.getSize()).toBe(1);
  });

  it("treats an expired entry as not blocked and evicts it", () => {
    tokenBlocklist.add("jti-expired", Date.now() - 1000);
    expect(tokenBlocklist.isBlocked("jti-expired")).toBe(false);
    expect(tokenBlocklist.getSize()).toBe(0);
  });

  it("clear() empties the blocklist", () => {
    tokenBlocklist.add("jti-1", Date.now() + 10_000);
    tokenBlocklist.clear();
    expect(tokenBlocklist.getSize()).toBe(0);
  });

  it("add() works without an email", () => {
    expect(() =>
      tokenBlocklist.add("jti-no-email", Date.now() + 10_000),
    ).not.toThrow();
  });
});

describe("tokenBlocklist automatic cleanup interval", () => {
  it("periodically evicts expired entries via the internal cleanup timer", () => {
    jest.useFakeTimers();
    jest.resetModules();
    // The singleton's cleanup interval is scheduled once, in its
    // constructor at import time - re-import fresh under fake timers so
    // advancing them actually fires it (the module-level instance imported
    // at the top of this file started its interval under real timers).
    const fresh = require("@/lib/token-blocklist")
      .default as typeof tokenBlocklist;
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    fresh.add("expired-1", Date.now() - 1000);
    fresh.add("still-valid", Date.now() + 60 * 60 * 1000);
    expect(fresh.getSize()).toBe(2);

    jest.advanceTimersByTime(60 * 60 * 1000);

    expect(fresh.getSize()).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Cleaned up 1 expired entries"),
    );

    fresh.stopCleanup();
    logSpy.mockRestore();
    jest.useRealTimers();
  });

  it("does not log when the cleanup interval finds nothing expired", () => {
    jest.useFakeTimers();
    jest.resetModules();
    const fresh = require("@/lib/token-blocklist")
      .default as typeof tokenBlocklist;
    fresh.add("still-valid", Date.now() + 60 * 60 * 1000);

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    jest.advanceTimersByTime(60 * 60 * 1000);

    expect(fresh.getSize()).toBe(1);
    expect(logSpy).not.toHaveBeenCalled();

    fresh.stopCleanup();
    logSpy.mockRestore();
    jest.useRealTimers();
  });

  it("stopCleanup() is a no-op when cleanup was already stopped", () => {
    jest.resetModules();
    const fresh = require("@/lib/token-blocklist")
      .default as typeof tokenBlocklist;
    fresh.stopCleanup();
    expect(() => fresh.stopCleanup()).not.toThrow();
  });

  it("does not start the cleanup interval when a window global is present", () => {
    jest.resetModules();
    (globalThis as { window?: unknown }).window = {};
    try {
      const setIntervalSpy = jest.spyOn(globalThis, "setInterval");
      require("@/lib/token-blocklist");
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it("does not call unref when the interval handle lacks it", () => {
    jest.resetModules();
    const fakeTimer = {} as unknown as NodeJS.Timeout;
    const setIntervalSpy = jest
      .spyOn(globalThis, "setInterval")
      .mockReturnValue(fakeTimer as never);
    const fresh = require("@/lib/token-blocklist")
      .default as typeof tokenBlocklist;
    expect(fresh).toBeDefined();
    setIntervalSpy.mockRestore();
  });
});
