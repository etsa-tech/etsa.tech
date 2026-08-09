/**
 * Default (node) test environment - no `document` global, exercising the
 * SSR safety guards in cookies.ts that jsdom-based tests can never reach.
 */
import {
  saveRSVPDataToCookies,
  loadRSVPDataFromCookies,
  clearRSVPDataFromCookies,
  areCookiesSupported,
} from "@/lib/cookies";

describe("cookies.ts server-side safety guards", () => {
  it("no-ops without throwing when document is undefined", () => {
    expect(typeof document).toBe("undefined");
    expect(() =>
      saveRSVPDataToCookies({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        howDidYouHear: "Meetup",
      }),
    ).not.toThrow();
    expect(loadRSVPDataFromCookies()).toBeNull();
    expect(() => clearRSVPDataFromCookies()).not.toThrow();
    expect(areCookiesSupported()).toBe(false);
  });
});
