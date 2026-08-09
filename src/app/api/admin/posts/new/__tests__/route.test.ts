import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  createOrUpdateFile,
  createBranch,
  createOrGetPullRequest,
} from "@/lib/github";
import { formatBlogPostContent } from "@/lib/server-only-formatter";
import { POST } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github", () => ({
  createOrUpdateFile: jest.fn(),
  createBranch: jest.fn(),
  createOrGetPullRequest: jest.fn(),
}));
jest.mock("@/lib/server-only-formatter", () => ({
  formatBlogPostContent: jest.fn((s: string) => Promise.resolve(s)),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedCreateOrUpdateFile = jest.mocked(createOrUpdateFile);
const mockedCreateBranch = jest.mocked(createBranch);
const mockedCreateOrGetPullRequest = jest.mocked(createOrGetPullRequest);
const mockedFormatBlogPostContent = jest.mocked(formatBlogPostContent);

function postReq(body: unknown) {
  return new NextRequest("http://localhost/x", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { name: "Jane", email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
  mockedFormatBlogPostContent.mockImplementation((s) => Promise.resolve(s));
});

afterEach(() => jest.clearAllMocks());

describe("POST /api/admin/posts/new", () => {
  it("creates a branch and PR by default", async () => {
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 12,
      isNew: true,
    });
    const res = await POST(
      postReq({
        slug: "2026-01-01-my-post",
        frontmatter: { title: "My Post", date: "2026-01-01" },
        content: "body",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prNumber).toBe(12);
    expect(body.isNewPR).toBe(true);
    expect(mockedCreateBranch).toHaveBeenCalledWith(
      "feature/2026-01-01-my-post",
    );
    expect(mockedCreateOrUpdateFile).toHaveBeenCalledWith(
      "posts/2026-01-01-my-post.md",
      expect.any(String),
      expect.stringContaining("My Post"),
      undefined,
      "feature/2026-01-01-my-post",
    );
  });

  it("derives the branch date from the slug when frontmatter has none", async () => {
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 1,
      isNew: true,
    });
    await POST(
      postReq({
        slug: "2026-02-02-other-post",
        frontmatter: { title: "Other" },
        content: "body",
      }),
    );
    // Branch name is feature/<eventDate>-<sanitized *title*>, not the slug -
    // eventDate falls back to the slug's leading YYYY-MM-DD, but the suffix
    // comes from frontmatter.title ("Other" -> "other").
    expect(mockedCreateBranch).toHaveBeenCalledWith("feature/2026-02-02-other");
  });

  it("writes directly to main when createPR is false", async () => {
    const res = await POST(
      postReq({
        slug: "my-post",
        frontmatter: { title: "My Post" },
        content: "body",
        createPR: false,
      }),
    );
    expect(res.status).toBe(200);
    expect(mockedCreateBranch).not.toHaveBeenCalled();
    expect(mockedCreateOrUpdateFile).toHaveBeenCalledWith(
      "posts/my-post.md",
      expect.any(String),
      expect.stringContaining("My Post"),
      undefined,
      "main",
    );
  });

  it("400s when slug is missing", async () => {
    const res = await POST(
      postReq({ frontmatter: { title: "x" }, content: "body" }),
    );
    expect(res.status).toBe(400);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await POST(
      postReq({ slug: "x", frontmatter: {}, content: "body" }),
    );
    expect(res.status).toBe(401);
  });

  it("500s when branch creation fails", async () => {
    mockedCreateBranch.mockRejectedValue(new Error("branch exists"));
    const res = await POST(
      postReq({ slug: "x", frontmatter: { title: "x" }, content: "body" }),
    );
    expect(res.status).toBe(500);
  });
});
