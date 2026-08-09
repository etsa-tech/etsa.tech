import tokenBlocklist from "@/lib/token-blocklist";

jest.mock("@/lib/token-blocklist", () => ({
  __esModule: true,
  default: { add: jest.fn(), isBlocked: jest.fn(() => false) },
}));

import { authOptions } from "@/lib/auth";

const mockedBlocklist = jest.mocked(tokenBlocklist);

afterEach(() => jest.resetAllMocks());

describe("authOptions.callbacks.signIn", () => {
  const signIn = authOptions.callbacks!.signIn!;

  it("allows an @etsa.tech Google sign-in", async () => {
    const ok = await signIn({
      user: { email: "person@etsa.tech" },
      account: { provider: "google" },
    } as never);
    expect(ok).toBe(true);
  });

  it("rejects a non-etsa.tech Google sign-in", async () => {
    const ok = await signIn({
      user: { email: "person@gmail.com" },
      account: { provider: "google" },
    } as never);
    expect(ok).toBe(false);
  });

  it("allows sign-in when there's no account/provider info", async () => {
    const ok = await signIn({ user: { email: "person@gmail.com" } } as never);
    expect(ok).toBe(true);
  });
});

describe("authOptions.callbacks.session", () => {
  const session = authOptions.callbacks!.session!;

  it("passes through a session with a recent lastActivity", async () => {
    const result = await session({
      session: { user: { email: "person@etsa.tech" } },
      token: { lastActivity: Date.now() },
    } as never);
    expect(result.user?.email).toBe("person@etsa.tech");
  });

  it("throws and blocklists the token when the session is inactive past the timeout", async () => {
    const staleTime = Date.now() - 25 * 60 * 60 * 1000;
    await expect(
      session({
        session: { user: { email: "person@etsa.tech" } },
        token: { lastActivity: staleTime, jti: "jti-1" },
      } as never),
    ).rejects.toThrow(/Session expired/);
    expect(mockedBlocklist.add).toHaveBeenCalledWith(
      "jti-1",
      expect.any(Number),
      "person@etsa.tech",
    );
  });

  it("throws on inactivity timeout even without a jti to blocklist", async () => {
    const staleTime = Date.now() - 25 * 60 * 60 * 1000;
    await expect(
      session({
        session: { user: { email: "person@etsa.tech" } },
        token: { lastActivity: staleTime },
      } as never),
    ).rejects.toThrow(/Session expired/);
    expect(mockedBlocklist.add).not.toHaveBeenCalled();
  });

  it("logs and blocklists with 'unknown'/undefined email when the session has no user email", async () => {
    const staleTime = Date.now() - 25 * 60 * 60 * 1000;
    await expect(
      session({
        session: { user: {} },
        token: { lastActivity: staleTime, jti: "jti-no-email" },
      } as never),
    ).rejects.toThrow(/Session expired/);
    expect(mockedBlocklist.add).toHaveBeenCalledWith(
      "jti-no-email",
      expect.any(Number),
      undefined,
    );
  });

  it("copies the picture from the token onto session.user", async () => {
    const result = await session({
      session: { user: { email: "person@etsa.tech" } },
      token: { lastActivity: Date.now(), picture: "https://example.com/p.png" },
    } as never);
    expect(result.user?.image).toBe("https://example.com/p.png");
  });
});

describe("authOptions.callbacks.jwt", () => {
  const jwt = authOptions.callbacks!.jwt!;

  it("generates a jti on first Google sign-in", async () => {
    const token = await jwt({
      token: {},
      account: { provider: "google" },
    } as never);
    expect(typeof (token as { jti?: string }).jti).toBe("string");
    expect((token as { jti: string }).jti.length).toBeGreaterThan(0);
  });

  it("does not overwrite an existing jti", async () => {
    const token = await jwt({
      token: { jti: "existing" },
      account: { provider: "google" },
    } as never);
    expect((token as { jti?: string }).jti).toBe("existing");
  });

  it("returns an empty token when the jti is blocklisted", async () => {
    mockedBlocklist.isBlocked.mockReturnValue(true);
    const token = await jwt({ token: { jti: "blocked" } } as never);
    expect(token).toEqual({});
  });

  it("stores the profile picture when present", async () => {
    const token = await jwt({
      token: {},
      account: { provider: "google" },
      profile: { picture: "https://example.com/p.png" },
    } as never);
    expect((token as { picture?: string }).picture).toBe(
      "https://example.com/p.png",
    );
  });

  it("stamps lastActivity on every call", async () => {
    const before = Date.now();
    const token = await jwt({ token: {} } as never);
    expect(
      (token as { lastActivity: number }).lastActivity,
    ).toBeGreaterThanOrEqual(before);
  });
});

describe("authOptions.events.signOut", () => {
  const signOut = authOptions.events!.signOut!;

  it("blocklists the token jti with the token's email", async () => {
    await signOut({
      token: { jti: "jti-1", email: "person@etsa.tech" },
    } as never);
    expect(mockedBlocklist.add).toHaveBeenCalledWith(
      "jti-1",
      expect.any(Number),
      "person@etsa.tech",
    );
  });

  it("does nothing destructive when there's no jti", async () => {
    await expect(signOut({ token: {} } as never)).resolves.toBeUndefined();
    expect(mockedBlocklist.add).not.toHaveBeenCalled();
  });

  it("logs 'unknown' when a signed-out token has a jti but no email", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await signOut({ token: { jti: "jti-2" } } as never);
    expect(mockedBlocklist.add).toHaveBeenCalledWith(
      "jti-2",
      expect.any(Number),
      undefined,
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("unknown"));
    logSpy.mockRestore();
  });
});

describe("authOptions provider config", () => {
  it("registers exactly one Google provider", () => {
    expect(authOptions.providers).toHaveLength(1);
  });

  it("maps a Google profile onto the NextAuth user shape", () => {
    const google = authOptions.providers[0] as unknown as {
      options: { profile: (p: object) => object };
    };
    const mapped = google.options.profile({
      sub: "123",
      name: "Jane",
      email: "jane@etsa.tech",
      picture: "https://example.com/p.png",
    });
    expect(mapped).toEqual({
      id: "123",
      name: "Jane",
      email: "jane@etsa.tech",
      image: "https://example.com/p.png",
    });
  });
});
