import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  getTokenCacheStatus,
  verifyGitHubAppConfig,
  clearTokenCache,
  getRepoInfo,
} from "@/lib/github-app";
import { GET, DELETE } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github-app", () => ({
  getTokenCacheStatus: jest.fn(),
  verifyGitHubAppConfig: jest.fn(),
  clearTokenCache: jest.fn(),
  getRepoInfo: jest.fn(),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetTokenCacheStatus = jest.mocked(getTokenCacheStatus);
const mockedVerifyGitHubAppConfig = jest.mocked(verifyGitHubAppConfig);
const mockedClearTokenCache = jest.mocked(clearTokenCache);
const mockedGetRepoInfo = jest.mocked(getRepoInfo);

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
  mockedGetRepoInfo.mockReturnValue({ owner: "etsa", repo: "etsa.tech" });
  mockedGetTokenCacheStatus.mockReturnValue({ hasToken: true, isValid: true });
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/github-status", () => {
  it("reports connected status when config verification succeeds", async () => {
    mockedVerifyGitHubAppConfig.mockResolvedValue(true);
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("connected");
    expect(body.repository).toBe("etsa/etsa.tech");
  });

  it("reports error status when config verification fails", async () => {
    mockedVerifyGitHubAppConfig.mockResolvedValue(false);
    const res = await GET();
    expect((await res.json()).status).toBe("error");
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("500s and includes the error message when the check throws", async () => {
    mockedVerifyGitHubAppConfig.mockRejectedValue(new Error("boom"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("boom");
  });
});

describe("DELETE /api/admin/github-status", () => {
  it("clears the token cache", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mockedClearTokenCache).toHaveBeenCalled();
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await DELETE();
    expect(res.status).toBe(401);
    expect(mockedClearTokenCache).not.toHaveBeenCalled();
  });

  it("500s when clearing throws", async () => {
    mockedClearTokenCache.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await DELETE();
    expect(res.status).toBe(500);
  });
});
