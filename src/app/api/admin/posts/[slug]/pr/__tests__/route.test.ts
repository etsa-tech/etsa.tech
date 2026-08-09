import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getOpenPRForPost } from "@/lib/github";
import { GET } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github", () => ({ getOpenPRForPost: jest.fn() }));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetOpenPRForPost = jest.mocked(getOpenPRForPost);

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/posts/[slug]/pr", () => {
  it("returns the open PR info for the post", async () => {
    mockedGetOpenPRForPost.mockResolvedValue({
      branchName: "fix/x",
      prNumber: 5,
    });
    const res = await GET(
      new NextRequest("http://localhost/x"),
      ctx("my-slug"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).openPR).toEqual({
      branchName: "fix/x",
      prNumber: 5,
    });
    expect(mockedGetOpenPRForPost).toHaveBeenCalledWith("my-slug");
  });

  it("returns null openPR when none exists", async () => {
    mockedGetOpenPRForPost.mockResolvedValue(null);
    const res = await GET(
      new NextRequest("http://localhost/x"),
      ctx("my-slug"),
    );
    expect((await res.json()).openPR).toBeNull();
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(
      new NextRequest("http://localhost/x"),
      ctx("my-slug"),
    );
    expect(res.status).toBe(401);
  });

  it("500s when the lookup throws", async () => {
    mockedGetOpenPRForPost.mockRejectedValue(new Error("down"));
    const res = await GET(
      new NextRequest("http://localhost/x"),
      ctx("my-slug"),
    );
    expect(res.status).toBe(500);
  });
});
