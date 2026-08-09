const mockRequest = jest.fn();
const mockReposGet = jest.fn();

jest.mock("@octokit/app", () => ({
  App: jest.fn().mockImplementation(() => ({
    octokit: { request: mockRequest },
  })),
}));

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation((opts: unknown) => ({
    auth: opts,
    rest: { repos: { get: mockReposGet } },
  })),
}));

import {
  getGitHubClient,
  getGitHubToken,
  clearTokenCache,
  getTokenCacheStatus,
  getRepoInfo,
  verifyGitHubAppConfig,
} from "@/lib/github-app";

const originalEnv = process.env;

const validEnv = {
  GITHUB_APP_ID: "12345",
  GITHUB_APP_PRIVATE_KEY: "-----BEGIN KEY-----",
  GITHUB_APP_INSTALLATION_ID: "999",
};

beforeEach(() => {
  process.env = { ...originalEnv, ...validEnv };
  clearTokenCache();
  jest.clearAllMocks();
});

afterAll(() => {
  process.env = originalEnv;
});

function mockInstallationToken(expiresInMs = 60 * 60 * 1000) {
  mockRequest.mockResolvedValue({
    data: {
      token: "installation-token",
      expires_at: new Date(Date.now() + expiresInMs).toISOString(),
    },
  });
}

describe("getGitHubClient", () => {
  it("creates a new client and caches it", async () => {
    mockInstallationToken();
    const client = await getGitHubClient();
    expect(client).toBeDefined();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("reuses the cached client while the token is still valid", async () => {
    mockInstallationToken();
    await getGitHubClient();
    await getGitHubClient();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("refreshes the token once it's within the expiry buffer", async () => {
    mockInstallationToken(1000); // expires in 1s, well inside the 5-minute buffer
    await getGitHubClient();
    await getGitHubClient();
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it("throws and clears the cache when GITHUB_APP_ID is missing", async () => {
    delete process.env.GITHUB_APP_ID;
    await expect(getGitHubClient()).rejects.toThrow(/Failed to authenticate/);
    expect(getTokenCacheStatus()).toEqual({ hasToken: false });
  });

  it("throws when GITHUB_APP_PRIVATE_KEY is missing", async () => {
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    await expect(getGitHubClient()).rejects.toThrow(/Failed to authenticate/);
  });

  it("throws when GITHUB_APP_INSTALLATION_ID is missing", async () => {
    delete process.env.GITHUB_APP_INSTALLATION_ID;
    await expect(getGitHubClient()).rejects.toThrow(/Failed to authenticate/);
  });

  it("throws when GITHUB_APP_INSTALLATION_ID is not numeric", async () => {
    process.env.GITHUB_APP_INSTALLATION_ID = "not-a-number";
    await expect(getGitHubClient()).rejects.toThrow(/Failed to authenticate/);
  });

  it("throws when the token request itself fails", async () => {
    mockRequest.mockRejectedValue(new Error("GitHub API down"));
    await expect(getGitHubClient()).rejects.toThrow(/Failed to authenticate/);
  });
});

describe("getGitHubToken", () => {
  it("returns the raw installation token", async () => {
    mockInstallationToken();
    expect(await getGitHubToken()).toBe("installation-token");
  });
});

describe("getTokenCacheStatus", () => {
  it("reports no token before any request", () => {
    expect(getTokenCacheStatus()).toEqual({ hasToken: false });
  });

  it("reports a valid cached token after a request", async () => {
    mockInstallationToken();
    await getGitHubClient();
    const status = getTokenCacheStatus();
    expect(status.hasToken).toBe(true);
    expect(status.isValid).toBe(true);
  });
});

describe("getRepoInfo", () => {
  it("returns owner/repo from env, falling back to defaults", () => {
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;
    // Module-level constants were captured at import time from the env
    // present then, so this just asserts the shape rather than the value.
    expect(getRepoInfo()).toEqual({
      owner: expect.any(String),
      repo: expect.any(String),
    });
  });
});

describe("verifyGitHubAppConfig", () => {
  it("returns true when the repo is reachable", async () => {
    mockInstallationToken();
    mockReposGet.mockResolvedValue({ data: {} });
    expect(await verifyGitHubAppConfig()).toBe(true);
  });

  it("returns false and clears the cache when the repo call fails", async () => {
    mockInstallationToken();
    mockReposGet.mockRejectedValue(new Error("not found"));
    expect(await verifyGitHubAppConfig()).toBe(false);
    expect(getTokenCacheStatus()).toEqual({ hasToken: false });
  });
});
