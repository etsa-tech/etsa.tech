import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  getBlogPost,
  getFileContentWithSha,
  createOrUpdateFile,
  createBranch,
  createOrGetPullRequest,
  enableAutoMergeForPR,
  getBranches,
} from "@/lib/github";
import { getRepoInfo } from "@/lib/github-app";
import { formatBlogPostContent } from "@/lib/server-only-formatter";
import { GET, PUT } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github", () => ({
  getBlogPost: jest.fn(),
  getFileContentWithSha: jest.fn(),
  createOrUpdateFile: jest.fn(),
  createBranch: jest.fn(),
  createOrGetPullRequest: jest.fn(),
  enableAutoMergeForPR: jest.fn(),
  getBranches: jest.fn(),
}));
jest.mock("@/lib/github-app", () => ({ getRepoInfo: jest.fn() }));
jest.mock("@/lib/server-only-formatter", () => ({
  formatBlogPostContent: jest.fn((s: string) => Promise.resolve(s)),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetBlogPost = jest.mocked(getBlogPost);
const mockedGetFileContentWithSha = jest.mocked(getFileContentWithSha);
const mockedCreateOrUpdateFile = jest.mocked(createOrUpdateFile);
const mockedCreateBranch = jest.mocked(createBranch);
const mockedCreateOrGetPullRequest = jest.mocked(createOrGetPullRequest);
const mockedEnableAutoMergeForPR = jest.mocked(enableAutoMergeForPR);
const mockedGetBranches = jest.mocked(getBranches);
const mockedGetRepoInfo = jest.mocked(getRepoInfo);

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function getReq(query = "") {
  return new NextRequest(`http://localhost/x${query}`);
}

function putReq(body: unknown, query = "") {
  return new NextRequest(`http://localhost/x${query}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { name: "Jane", email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
  mockedGetRepoInfo.mockReturnValue({ owner: "etsa", repo: "etsa.tech" });
  mockedGetBranches.mockResolvedValue([]);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/posts/[slug]", () => {
  it("returns parsed frontmatter/content/rawContent, defaulting to main", async () => {
    mockedGetBlogPost.mockResolvedValue('---\ntitle: "X"\n---\nbody text');
    const res = await GET(getReq(), ctx("slug"));
    const body = await res.json();
    expect(body.frontmatter.title).toBe("X");
    expect(body.content.trim()).toBe("body text");
    expect(mockedGetBlogPost).toHaveBeenCalledWith("slug", "main");
  });

  it("passes the branch query param through", async () => {
    mockedGetBlogPost.mockResolvedValue("---\n---\nx");
    await GET(getReq("?branch=dev"), ctx("slug"));
    expect(mockedGetBlogPost).toHaveBeenCalledWith("slug", "dev");
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(getReq(), ctx("slug"));
    expect(res.status).toBe(401);
  });

  it("500s when getBlogPost throws", async () => {
    mockedGetBlogPost.mockRejectedValue(new Error("not found"));
    const res = await GET(getReq(), ctx("slug"));
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/admin/posts/[slug]", () => {
  it("creates a new fix/ branch and PR when no update branch exists", async () => {
    mockedGetFileContentWithSha.mockResolvedValue({
      content: "x",
      sha: "sha1",
    });
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 9,
      isNew: true,
    });

    const res = await PUT(
      putReq({ frontmatter: { title: "My Title" }, content: "body" }),
      ctx("slug"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockedCreateBranch).toHaveBeenCalledWith("fix/my-title");
    expect(body.prNumber).toBe(9);
    expect(body.prUrl).toBe("https://github.com/etsa/etsa.tech/pull/9");
    expect(body.autoMergeEnabled).toBe(false);
  });

  it.each([
    ["existing update-post-* branch", "update-post-slug-123"],
    ["existing new-post-* branch", "new-post-slug-456"],
    [
      "existing feature/* branch matching the slug's date prefix",
      "feature/slug-something",
    ],
    ["existing exact chore/* branch matching the sanitized title", "chore/x"],
  ])(
    "reuses an %s instead of creating a new one",
    async (_label, branchName) => {
      mockedGetBranches.mockResolvedValue([branchName]);
      mockedGetFileContentWithSha.mockResolvedValue({
        content: "x",
        sha: "sha-existing",
      });
      mockedCreateOrGetPullRequest.mockResolvedValue({
        prNumber: 3,
        isNew: false,
      });

      const res = await PUT(
        putReq({ frontmatter: { title: "X" }, content: "body" }),
        ctx("slug"),
      );
      const body = await res.json();
      expect(mockedCreateBranch).not.toHaveBeenCalled();
      expect(body.message).toMatch(/existing pull request/);
    },
  );

  it("falls back to main's SHA when the file doesn't exist yet on the existing branch", async () => {
    mockedGetBranches.mockResolvedValue(["update-post-slug-123"]);
    mockedGetFileContentWithSha
      .mockRejectedValueOnce(new Error("not found on branch"))
      .mockResolvedValueOnce({ content: "x", sha: "main-sha" });
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 3,
      isNew: false,
    });

    const res = await PUT(
      putReq({ frontmatter: { title: "X" }, content: "body" }),
      ctx("slug"),
    );
    expect(res.status).toBe(200);
    expect(mockedGetFileContentWithSha).toHaveBeenCalledTimes(2);
  });

  it("falls back to the slug for the PR title/commit message when frontmatter has no title", async () => {
    mockedGetFileContentWithSha.mockResolvedValue({
      content: "x",
      sha: "sha1",
    });
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 9,
      isNew: true,
    });

    const res = await PUT(
      putReq({ frontmatter: {}, content: "body" }),
      ctx("slug"),
    );
    expect(res.status).toBe(200);
    expect(mockedCreateOrUpdateFile).toHaveBeenCalledWith(
      "posts/slug.md",
      expect.any(String),
      "Update blog post: slug",
      "sha1",
      expect.any(String),
    );
  });

  it("falls back to the slug in the commit message for a direct update with no title", async () => {
    mockedGetFileContentWithSha.mockResolvedValue({
      content: "x",
      sha: "sha1",
    });
    const res = await PUT(
      putReq({ frontmatter: {}, content: "body", createPR: false }),
      ctx("slug"),
    );
    expect(res.status).toBe(200);
    expect(mockedCreateOrUpdateFile).toHaveBeenCalledWith(
      "posts/slug.md",
      expect.any(String),
      "Update blog post: slug",
      "sha1",
      "main",
    );
  });

  it("falls back to the slug in the commit message when creating a new file with no title", async () => {
    mockedGetFileContentWithSha.mockRejectedValue(new Error("not found"));
    const res = await PUT(
      putReq({ frontmatter: {}, content: "body", createPR: false }),
      ctx("slug"),
    );
    expect(res.status).toBe(200);
    expect(mockedCreateOrUpdateFile).toHaveBeenCalledWith(
      "posts/slug.md",
      expect.any(String),
      "Create blog post: slug",
      undefined,
      "main",
    );
  });

  it("enables auto-merge when requested", async () => {
    mockedGetFileContentWithSha.mockResolvedValue({
      content: "x",
      sha: "sha1",
    });
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 9,
      isNew: true,
    });
    mockedEnableAutoMergeForPR.mockResolvedValue(true);

    const res = await PUT(
      putReq({ frontmatter: { title: "X" }, content: "body", autoMerge: true }),
      ctx("slug"),
    );
    expect((await res.json()).autoMergeEnabled).toBe(true);
    expect(mockedEnableAutoMergeForPR).toHaveBeenCalledWith(9);
  });

  it("updates the file directly on the given branch when createPR is false", async () => {
    mockedGetFileContentWithSha.mockResolvedValue({
      content: "x",
      sha: "sha1",
    });
    const res = await PUT(
      putReq(
        { frontmatter: { title: "X" }, content: "body", createPR: false },
        "?branch=main",
      ),
      ctx("slug"),
    );
    expect(res.status).toBe(200);
    expect(mockedCreateOrUpdateFile).toHaveBeenCalledWith(
      "posts/slug.md",
      expect.any(String),
      expect.stringContaining("Update blog post"),
      "sha1",
      "main",
    );
  });

  it("creates the file without a SHA when it doesn't exist yet and createPR is false", async () => {
    mockedGetFileContentWithSha.mockRejectedValue(new Error("not found"));
    const res = await PUT(
      putReq({ frontmatter: { title: "X" }, content: "body", createPR: false }),
      ctx("slug"),
    );
    expect(res.status).toBe(200);
    expect(mockedCreateOrUpdateFile).toHaveBeenCalledWith(
      "posts/slug.md",
      expect.any(String),
      expect.stringContaining("Create blog post"),
      undefined,
      "main",
    );
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await PUT(
      putReq({ frontmatter: {}, content: "" }),
      ctx("slug"),
    );
    expect(res.status).toBe(401);
  });

  it("500s when branch resolution throws", async () => {
    mockedGetBranches.mockRejectedValue(new Error("down"));
    const res = await PUT(
      putReq({ frontmatter: { title: "X" }, content: "body" }),
      ctx("slug"),
    );
    expect(res.status).toBe(500);
  });
});
