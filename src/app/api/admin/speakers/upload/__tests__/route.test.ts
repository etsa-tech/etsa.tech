import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getGitHubClient, getGitHubToken, getRepoInfo } from "@/lib/github-app";
import {
  createBranch,
  createOrGetPullRequest,
  getBlogPost,
} from "@/lib/github";
import { getCommitContent } from "@/lib/git-lfs";
import { POST } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github-app", () => ({
  getGitHubClient: jest.fn(),
  getGitHubToken: jest.fn(),
  getRepoInfo: jest.fn(),
}));
jest.mock("@/lib/github", () => ({
  createBranch: jest.fn(),
  createOrGetPullRequest: jest.fn(),
  getBlogPost: jest.fn(),
}));
jest.mock("@/lib/git-lfs", () => ({ getCommitContent: jest.fn() }));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetGitHubClient = jest.mocked(getGitHubClient);
const mockedGetGitHubToken = jest.mocked(getGitHubToken);
const mockedGetRepoInfo = jest.mocked(getRepoInfo);
const mockedCreateBranch = jest.mocked(createBranch);
const mockedCreateOrGetPullRequest = jest.mocked(createOrGetPullRequest);
const mockedGetBlogPost = jest.mocked(getBlogPost);
const mockedGetCommitContent = jest.mocked(getCommitContent);

function octokitStub() {
  return {
    rest: {
      repos: {
        listBranches: jest.fn().mockResolvedValue({ data: [] }),
        getContent: jest.fn().mockRejectedValue(new Error("not found")),
        createOrUpdateFileContents: jest
          .fn()
          .mockResolvedValue({ data: { content: { sha: "new-sha" } } }),
      },
    },
  };
}

let octokit: ReturnType<typeof octokitStub>;

function uploadRequest(overrides: {
  file?: File | null;
  slug?: string | null;
  branch?: string | null;
}) {
  const formData = new FormData();
  const file =
    overrides.file === undefined
      ? new File(["bytes"], "speaker.png", { type: "image/png" })
      : overrides.file;
  if (file) formData.set("file", file);
  if (overrides.slug !== null)
    formData.set("slug", overrides.slug ?? "my-post");
  if (overrides.branch !== null)
    formData.set("branch", overrides.branch ?? "main");

  return {
    formData: async () => formData,
  } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  octokit = octokitStub();
  mockedGetServerSession.mockResolvedValue({
    user: { name: "Jane", email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
  mockedGetGitHubClient.mockResolvedValue(octokit as never);
  mockedGetGitHubToken.mockResolvedValue("token");
  mockedGetRepoInfo.mockReturnValue({ owner: "etsa", repo: "etsa.tech" });
  mockedGetCommitContent.mockResolvedValue("base64content");
});

afterEach(() => jest.clearAllMocks());

describe("POST /api/admin/speakers/upload", () => {
  it("uploads directly to a non-main branch without creating a PR", async () => {
    const res = await POST(uploadRequest({ branch: "feature/x" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.branch).toBe("feature/x");
    expect(body.pullRequest).toBeNull();
    expect(mockedCreateBranch).not.toHaveBeenCalled();
  });

  it("creates a new update branch and PR when uploading from main with no existing branch", async () => {
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 7,
      isNew: true,
    });
    mockedGetBlogPost.mockResolvedValue('---\ntitle: "My Post"\n---\nbody');
    const res = await POST(uploadRequest({ branch: "main" }));
    const body = await res.json();
    expect(mockedCreateBranch).toHaveBeenCalled();
    expect(body.pullRequest).toEqual({
      prNumber: 7,
      isNew: true,
      branchName: expect.stringContaining("update-post-my-post-"),
    });
  });

  it("reuses an existing update branch instead of creating a new one", async () => {
    octokit.rest.repos.listBranches.mockResolvedValue({
      data: [{ name: "update-post-my-post-123" }],
    });
    const res = await POST(uploadRequest({ branch: "main" }));
    const body = await res.json();
    expect(body.branch).toBe("update-post-my-post-123");
    expect(mockedCreateBranch).not.toHaveBeenCalled();
    expect(body.pullRequest).toBeNull();
  });

  it("marks the response as an update when the file already exists on the target branch", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: { type: "file", sha: "existing-sha" },
    });
    const res = await POST(uploadRequest({ branch: "feature/x" }));
    expect((await res.json()).message).toMatch(/updated successfully/);
  });

  it("treats a directory-listing getContent response as no existing file", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({ data: [] });
    const res = await POST(uploadRequest({ branch: "feature/x" }));
    expect((await res.json()).message).not.toMatch(/updated successfully/);
  });

  it("falls back to the slug for the PR title when the post has no title", async () => {
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 8,
      isNew: true,
    });
    mockedGetBlogPost.mockResolvedValue("---\n---\nbody");
    const res = await POST(uploadRequest({ branch: "main" }));
    expect(res.status).toBe(200);
    expect(mockedCreateOrGetPullRequest).toHaveBeenCalledWith(
      expect.any(String),
      "Update blog post: my-post",
      expect.stringContaining('"my-post"'),
    );
  });

  it("400s when a required field is missing", async () => {
    const res = await POST(uploadRequest({ slug: null }));
    expect(res.status).toBe(400);
  });

  it("400s for a disallowed file type", async () => {
    const res = await POST(
      uploadRequest({
        file: new File(["x"], "doc.pdf", { type: "application/pdf" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400s for a file over the size limit", async () => {
    const big = new File([new Uint8Array(1)], "big.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    const res = await POST(uploadRequest({ file: big }));
    expect(res.status).toBe(400);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await POST(uploadRequest({}));
    expect(res.status).toBe(401);
  });

  it("500s when the GitHub client throws", async () => {
    mockedGetGitHubClient.mockRejectedValue(new Error("auth failed"));
    const res = await POST(uploadRequest({}));
    expect(res.status).toBe(500);
  });

  it("falls back to the current branch when branch logic throws on main", async () => {
    octokit.rest.repos.listBranches.mockRejectedValue(new Error("down"));
    const res = await POST(uploadRequest({ branch: "main" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.branch).toBe("main");
    expect(body.pullRequest).toBeNull();
    expect(mockedCreateBranch).not.toHaveBeenCalled();
  });

  it("continues without a PR when PR creation fails after creating a new branch", async () => {
    mockedCreateOrGetPullRequest.mockRejectedValue(new Error("pr failed"));
    mockedGetBlogPost.mockResolvedValue('---\ntitle: "My Post"\n---\nbody');
    const res = await POST(uploadRequest({ branch: "main" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pullRequest).toBeNull();
  });
});
