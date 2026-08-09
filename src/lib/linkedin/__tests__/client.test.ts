import {
  buildAuthorizeUrl,
  createOrganizationPost,
  exchangeCodeForToken,
  getLinkedInOrgConfig,
  getLinkedInSpeakerConfig,
  getMemberSub,
  getSiteOrigin,
  verifyOrganizationAdmin,
} from "@/lib/linkedin/client";

const originalEnv = process.env;
const originalFetch = global.fetch;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    LINKEDIN_CLIENT_ID: "client-id",
    LINKEDIN_CLIENT_SECRET: "client-secret",
    LINKEDIN_ORGANIZATION_ID: "12345",
    LINKEDIN_SPEAKER_CLIENT_ID: "speaker-client-id",
    LINKEDIN_SPEAKER_CLIENT_SECRET: "speaker-client-secret",
    NEXTAUTH_URL: "http://localhost:3000/",
  };
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
});

function jsonResponse(
  body: unknown,
  init: {
    ok?: boolean;
    status?: number;
    headers?: Record<string, string>;
  } = {},
) {
  const { ok = true, status = 200, headers = {} } = init;
  return {
    ok,
    status,
    json: async () => body,
    headers: { get: (key: string) => headers[key] ?? null },
  } as unknown as Response;
}

describe("getLinkedInOrgConfig", () => {
  it("returns the configured values", () => {
    expect(getLinkedInOrgConfig()).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      organizationId: "12345",
    });
  });

  it.each([
    "LINKEDIN_CLIENT_ID",
    "LINKEDIN_CLIENT_SECRET",
    "LINKEDIN_ORGANIZATION_ID",
  ])("throws when %s is missing", (key) => {
    delete process.env[key];
    expect(() => getLinkedInOrgConfig()).toThrow(
      "LinkedIn organization app configuration missing",
    );
  });
});

describe("getLinkedInSpeakerConfig", () => {
  it("returns the configured values", () => {
    expect(getLinkedInSpeakerConfig()).toEqual({
      clientId: "speaker-client-id",
      clientSecret: "speaker-client-secret",
    });
  });

  it.each(["LINKEDIN_SPEAKER_CLIENT_ID", "LINKEDIN_SPEAKER_CLIENT_SECRET"])(
    "throws when %s is missing",
    (key) => {
      delete process.env[key];
      expect(() => getLinkedInSpeakerConfig()).toThrow(
        "LinkedIn speaker app configuration missing",
      );
    },
  );
});

describe("getSiteOrigin", () => {
  it("strips a trailing slash", () => {
    expect(getSiteOrigin()).toBe("http://localhost:3000");
  });

  it("throws when NEXTAUTH_URL is not configured", () => {
    delete process.env.NEXTAUTH_URL;
    expect(() => getSiteOrigin()).toThrow("NEXTAUTH_URL is not configured");
  });
});

describe("buildAuthorizeUrl", () => {
  it("builds the LinkedIn authorization URL with all params", () => {
    const url = buildAuthorizeUrl({
      clientId: "client-id",
      redirectUri: "http://localhost:3000/callback",
      state: "signed-state",
      scope: "w_organization_social",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://www.linkedin.com/oauth/v2/authorization",
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/callback",
    );
    expect(parsed.searchParams.get("state")).toBe("signed-state");
    expect(parsed.searchParams.get("scope")).toBe("w_organization_social");
  });
});

describe("exchangeCodeForToken", () => {
  it("returns the access token on success", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ access_token: "token-123" }),
      ) as unknown as typeof fetch;

    const result = await exchangeCodeForToken({
      code: "code",
      redirectUri: "http://localhost:3000/callback",
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    expect(result).toEqual({ accessToken: "token-123" });
    const [, init] = jest.mocked(global.fetch).mock.calls[0];
    expect(init?.method).toBe("POST");
  });

  it("throws LinkedIn's error_description when the exchange fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { error_description: "bad code" },
          { ok: false, status: 400 },
        ),
      ) as unknown as typeof fetch;

    await expect(
      exchangeCodeForToken({
        code: "bad",
        redirectUri: "http://localhost:3000/callback",
        clientId: "client-id",
        clientSecret: "client-secret",
      }),
    ).rejects.toThrow("bad code");
  });

  it("falls back to a status-based error when there's no error_description", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(null, { ok: false, status: 500 }),
      ) as unknown as typeof fetch;

    await expect(
      exchangeCodeForToken({
        code: "bad",
        redirectUri: "http://localhost:3000/callback",
        clientId: "client-id",
        clientSecret: "client-secret",
      }),
    ).rejects.toThrow("LinkedIn token exchange failed: 500");
  });

  it("re-throws a non-abort fetch failure as-is", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    await expect(
      exchangeCodeForToken({
        code: "code",
        redirectUri: "http://localhost:3000/callback",
        clientId: "client-id",
        clientSecret: "client-secret",
      }),
    ).rejects.toThrow("network down");
  });

  it("actually aborts and times out a request that never resolves", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    ) as unknown as typeof fetch;

    const pending = exchangeCodeForToken({
      code: "code",
      redirectUri: "http://localhost:3000/callback",
      clientId: "client-id",
      clientSecret: "client-secret",
    });
    const assertion = expect(pending).rejects.toThrow(
      "LinkedIn API request timed out",
    );
    await jest.advanceTimersByTimeAsync(10000);
    await assertion;
    jest.useRealTimers();
  });

  it("treats an unparseable body as a status-based error on token exchange", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;

    await expect(
      exchangeCodeForToken({
        code: "code",
        redirectUri: "http://localhost:3000/callback",
        clientId: "client-id",
        clientSecret: "client-secret",
      }),
    ).rejects.toThrow("LinkedIn token exchange failed: 502");
  });

  it("treats an unparseable body as a failure on getMemberSub", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;
    await expect(getMemberSub("token")).rejects.toThrow(
      "Failed to load LinkedIn profile: 502",
    );
  });

  it("treats an unparseable body as a failure on verifyOrganizationAdmin", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;
    await expect(verifyOrganizationAdmin("token", "12345")).rejects.toThrow(
      "Failed to verify LinkedIn organization access: 502",
    );
  });

  it("treats an unparseable error body as a status-based error on createOrganizationPost", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;
    await expect(
      createOrganizationPost({
        accessToken: "token",
        organizationId: "12345",
        commentary: "Hello LinkedIn",
      }),
    ).rejects.toThrow("LinkedIn post failed: 502");
  });
});

describe("getMemberSub", () => {
  it("returns the OIDC sub claim", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ sub: "member-456" }),
      ) as unknown as typeof fetch;
    expect(await getMemberSub("token")).toBe("member-456");
  });

  it("throws when the userinfo call fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(null, { ok: false, status: 401 }),
      ) as unknown as typeof fetch;
    await expect(getMemberSub("token")).rejects.toThrow(
      "Failed to load LinkedIn profile: 401",
    );
  });
});

describe("verifyOrganizationAdmin", () => {
  it("returns true when the org is among the member's admin roles", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        elements: [{ organization: "urn:li:organization:12345" }],
      }),
    ) as unknown as typeof fetch;
    expect(await verifyOrganizationAdmin("token", "12345")).toBe(true);
  });

  it("returns false when the org is not among the member's admin roles", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        elements: [{ organization: "urn:li:organization:99999" }],
      }),
    ) as unknown as typeof fetch;
    expect(await verifyOrganizationAdmin("token", "12345")).toBe(false);
  });

  it("throws when the ACL lookup fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(null, { ok: false, status: 403 }),
      ) as unknown as typeof fetch;
    await expect(verifyOrganizationAdmin("token", "12345")).rejects.toThrow(
      "Failed to verify LinkedIn organization access: 403",
    );
  });
});

describe("createOrganizationPost", () => {
  it("returns the post urn and a human-viewable url", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({}, { headers: { "x-restli-id": "urn:li:share:abc123" } }),
      ) as unknown as typeof fetch;

    const result = await createOrganizationPost({
      accessToken: "token",
      organizationId: "12345",
      commentary: "Hello LinkedIn",
    });

    expect(result).toEqual({
      postUrn: "urn:li:share:abc123",
      postUrl: "https://www.linkedin.com/feed/update/urn:li:share:abc123/",
    });
  });

  it("falls back to the x-linkedin-id header", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(
          {},
          { headers: { "x-linkedin-id": "urn:li:share:def456" } },
        ),
      ) as unknown as typeof fetch;

    const result = await createOrganizationPost({
      accessToken: "token",
      organizationId: "12345",
      commentary: "Hello LinkedIn",
    });
    expect(result.postUrn).toBe("urn:li:share:def456");
  });

  it("throws LinkedIn's message when the post fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: "rate limited" }, { ok: false, status: 429 }),
      ) as unknown as typeof fetch;

    await expect(
      createOrganizationPost({
        accessToken: "token",
        organizationId: "12345",
        commentary: "Hello LinkedIn",
      }),
    ).rejects.toThrow("rate limited");
  });

  it("falls back to a status-based error when there's no message", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(null, { ok: false, status: 500 }),
      ) as unknown as typeof fetch;

    await expect(
      createOrganizationPost({
        accessToken: "token",
        organizationId: "12345",
        commentary: "Hello LinkedIn",
      }),
    ).rejects.toThrow("LinkedIn post failed: 500");
  });

  it("throws when LinkedIn returns no post id header", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({})) as unknown as typeof fetch;

    await expect(
      createOrganizationPost({
        accessToken: "token",
        organizationId: "12345",
        commentary: "Hello LinkedIn",
      }),
    ).rejects.toThrow("LinkedIn did not return a post id");
  });
});
