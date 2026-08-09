import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getBlogPosts, getFileContent } from "@/lib/github";
import { GET } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github", () => ({
  getBlogPosts: jest.fn(),
  getFileContent: jest.fn(),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetBlogPosts = jest.mocked(getBlogPosts);
const mockedGetFileContent = jest.mocked(getFileContent);

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/posts", () => {
  it("returns markdown posts with parsed frontmatter, defaulting to the main branch", async () => {
    mockedGetBlogPosts.mockResolvedValue([
      { name: "a.md", path: "posts/a.md", sha: "1", size: 1, type: "file" },
      {
        name: "readme.txt",
        path: "posts/readme.txt",
        sha: "2",
        size: 1,
        type: "file",
      },
    ]);
    mockedGetFileContent.mockResolvedValue('---\ntitle: "A"\n---\nbody');

    const res = await GET(new NextRequest("http://localhost/api/admin/posts"));
    expect(res.status).toBe(200);
    const { posts } = await res.json();
    expect(posts).toHaveLength(1);
    expect(posts[0].frontmatter.title).toBe("A");
    expect(mockedGetBlogPosts).toHaveBeenCalledWith("main");
  });

  it("uses the branch query param when provided", async () => {
    mockedGetBlogPosts.mockResolvedValue([]);
    await GET(new NextRequest("http://localhost/api/admin/posts?branch=dev"));
    expect(mockedGetBlogPosts).toHaveBeenCalledWith("dev");
  });

  it("falls back to empty frontmatter when a single post's content fetch fails", async () => {
    mockedGetBlogPosts.mockResolvedValue([
      { name: "a.md", path: "posts/a.md", sha: "1", size: 1, type: "file" },
    ]);
    mockedGetFileContent.mockRejectedValue(new Error("not found"));

    const res = await GET(new NextRequest("http://localhost/api/admin/posts"));
    const { posts } = await res.json();
    expect(posts[0].frontmatter).toEqual({});
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(new NextRequest("http://localhost/api/admin/posts"));
    expect(res.status).toBe(401);
  });

  it("500s with error details when the listing call throws", async () => {
    mockedGetBlogPosts.mockRejectedValue(new Error("rate limited"));
    const res = await GET(new NextRequest("http://localhost/api/admin/posts"));
    expect(res.status).toBe(500);
    expect((await res.json()).details).toBe("rate limited");
  });

  it("500s with a stringified error when a non-Error is thrown", async () => {
    mockedGetBlogPosts.mockRejectedValue("rate limited string");
    const res = await GET(new NextRequest("http://localhost/api/admin/posts"));
    expect(res.status).toBe(500);
    expect((await res.json()).details).toBe("rate limited string");
  });
});
