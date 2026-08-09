import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getCachedRsvpReport, saveCachedRsvpReport } from "@/lib/rsvp-cache";
import { GET, PUT } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/rsvp-cache", () => ({
  getCachedRsvpReport: jest.fn(),
  saveCachedRsvpReport: jest.fn(),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetCachedRsvpReport = jest.mocked(getCachedRsvpReport);
const mockedSaveCachedRsvpReport = jest.mocked(saveCachedRsvpReport);

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function putReq(body: unknown) {
  return new NextRequest("http://localhost/x", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/posts/[slug]/rsvps/cache", () => {
  it("returns the cached report", async () => {
    mockedGetCachedRsvpReport.mockResolvedValue({
      data: { n: 1 },
      savedAt: "t",
      savedBy: null,
    });
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect(res.status).toBe(200);
    expect((await res.json()).cached).toEqual({
      data: { n: 1 },
      savedAt: "t",
      savedBy: null,
    });
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect(res.status).toBe(401);
  });

  it("500s when the cache lookup throws", async () => {
    mockedGetCachedRsvpReport.mockRejectedValue(new Error("down"));
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/admin/posts/[slug]/rsvps/cache", () => {
  it("saves the report under the session's email", async () => {
    mockedSaveCachedRsvpReport.mockResolvedValue({
      data: { n: 1 },
      savedAt: "t",
      savedBy: "a@etsa.tech",
    });
    const res = await PUT(putReq({ n: 1 }), ctx("slug"));
    expect(res.status).toBe(200);
    expect(mockedSaveCachedRsvpReport).toHaveBeenCalledWith(
      "slug",
      { n: 1 },
      "a@etsa.tech",
    );
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await PUT(putReq({ n: 1 }), ctx("slug"));
    expect(res.status).toBe(401);
    expect(mockedSaveCachedRsvpReport).not.toHaveBeenCalled();
  });

  it("500s when saving throws", async () => {
    mockedSaveCachedRsvpReport.mockRejectedValue(new Error("down"));
    const res = await PUT(putReq({ n: 1 }), ctx("slug"));
    expect(res.status).toBe(500);
  });
});
