import { isAuthorizedUser, requireAuthorizedUser } from "@/lib/auth-utils";
import type { Session } from "next-auth";

function sessionWith(email: string | undefined | null): Session {
  return { user: { email } } as unknown as Session;
}

describe("isAuthorizedUser", () => {
  it("allows an @etsa.tech email", () => {
    expect(isAuthorizedUser(sessionWith("person@etsa.tech"))).toBe(true);
  });

  it("rejects a non-etsa.tech email", () => {
    expect(isAuthorizedUser(sessionWith("person@example.com"))).toBe(false);
  });

  it("rejects a null session", () => {
    expect(isAuthorizedUser(null)).toBe(false);
  });

  it("rejects a session with no email", () => {
    expect(isAuthorizedUser(sessionWith(undefined))).toBe(false);
  });
});

describe("requireAuthorizedUser", () => {
  it("does not throw for an authorized session", () => {
    expect(() =>
      requireAuthorizedUser(sessionWith("person@etsa.tech")),
    ).not.toThrow();
  });

  it("throws for an unauthorized session", () => {
    expect(() => requireAuthorizedUser(null)).toThrow(/Unauthorized/);
  });
});
