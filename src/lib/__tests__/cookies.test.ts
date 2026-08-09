/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://etsa.tech"}
 */
import {
  saveRSVPDataToCookies,
  loadRSVPDataFromCookies,
  clearRSVPDataFromCookies,
  hasRSVPDataInCookies,
  getCookieConsent,
  setCookieConsent,
  areCookiesSupported,
  type RSVPCookieData,
} from "@/lib/cookies";

function clearAllCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name)
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  });
}

beforeEach(() => {
  clearAllCookies();
});

const sample: RSVPCookieData = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  howDidYouHear: "Meetup",
};

describe("RSVP cookie data", () => {
  it("round-trips data through save/load", () => {
    saveRSVPDataToCookies(sample);
    expect(loadRSVPDataFromCookies()).toEqual(sample);
    expect(hasRSVPDataInCookies()).toBe(true);
  });

  it("returns null when nothing is saved", () => {
    expect(loadRSVPDataFromCookies()).toBeNull();
    expect(hasRSVPDataInCookies()).toBe(false);
  });

  it("clears saved data", () => {
    saveRSVPDataToCookies(sample);
    clearRSVPDataFromCookies();
    expect(loadRSVPDataFromCookies()).toBeNull();
  });

  it("returns null for malformed cookie JSON", () => {
    document.cookie = "etsa-rsvp-data=not-json;path=/;";
    expect(loadRSVPDataFromCookies()).toBeNull();
  });

  it("returns null when the parsed data fails shape validation", () => {
    document.cookie = `etsa-rsvp-data=${encodeURIComponent(
      JSON.stringify({ firstName: "Jane" }),
    )};path=/;`;
    expect(loadRSVPDataFromCookies()).toBeNull();
  });

  it("warns and does not throw when the data cannot be serialized", () => {
    const circular: Record<string, unknown> = { firstName: "Jane" };
    circular.self = circular;
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      saveRSVPDataToCookies(circular as unknown as RSVPCookieData),
    ).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to save RSVP data to cookies:",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});

describe("cookie consent", () => {
  it("defaults to false", () => {
    expect(getCookieConsent()).toBe(false);
  });

  it("round-trips true/false", () => {
    setCookieConsent(true);
    expect(getCookieConsent()).toBe(true);
    setCookieConsent(false);
    expect(getCookieConsent()).toBe(false);
  });
});

describe("areCookiesSupported", () => {
  it("returns true in a jsdom environment", () => {
    expect(areCookiesSupported()).toBe(true);
  });

  it("returns false when setting a cookie throws", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "cookie",
    );
    Object.defineProperty(document, "cookie", {
      configurable: true,
      set() {
        throw new Error("cookie write blocked");
      },
      get() {
        return "";
      },
    });
    try {
      expect(areCookiesSupported()).toBe(false);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(document, "cookie", originalDescriptor);
      }
    }
  });
});
