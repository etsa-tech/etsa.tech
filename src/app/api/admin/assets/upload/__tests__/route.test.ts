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
      ? new File(["bytes"], "diagram.png", { type: "image/png" })
      : overrides.file;
  if (file) formData.set("file", file);
  if (overrides.slug !== null)
    formData.set("slug", overrides.slug ?? "my-post");
  if (overrides.branch !== null)
    formData.set("branch", overrides.branch ?? "main");

  return { formData: async () => formData } as unknown as Parameters<
    typeof POST
  >[0];
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
  mockedGetBlogPost.mockResolvedValue('---\ntitle: "My Post"\n---\nbody');
});

afterEach(() => jest.clearAllMocks());

describe("POST /api/admin/assets/upload", () => {
  it("uploads directly to a non-main branch without creating a PR", async () => {
    const res = await POST(uploadRequest({ branch: "feature/x" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.branch).toBe("feature/x");
    expect(body.pullRequest).toBeNull();
    expect(body.file.url).toBe("/presentation/my-post/diagram.png");
  });

  it("creates a fix/ branch and PR when uploading from main with none existing", async () => {
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 4,
      isNew: true,
    });
    const res = await POST(uploadRequest({ branch: "main" }));
    const body = await res.json();
    expect(mockedCreateBranch).toHaveBeenCalledWith("fix/my-post");
    expect(body.pullRequest).toEqual({
      prNumber: 4,
      isNew: true,
      branchName: "fix/my-post",
    });
  });

  it("reuses an existing matching branch", async () => {
    octokit.rest.repos.listBranches.mockResolvedValue({
      data: [{ name: "fix/my-post" }],
    });
    const res = await POST(uploadRequest({ branch: "main" }));
    const body = await res.json();
    expect(body.branch).toBe("fix/my-post");
    expect(mockedCreateBranch).not.toHaveBeenCalled();
  });

  it("matches an existing branch via an older update-post-/new-post-/feature/ pattern", async () => {
    octokit.rest.repos.listBranches.mockResolvedValue({
      data: [{ name: "unrelated-branch" }, { name: "update-post-my-post-123" }],
    });
    const res = await POST(uploadRequest({ branch: "main" }));
    const body = await res.json();
    expect(body.branch).toBe("update-post-my-post-123");
    expect(mockedCreateBranch).not.toHaveBeenCalled();
  });

  it("creates a new branch when an existing branches list has no match", async () => {
    octokit.rest.repos.listBranches.mockResolvedValue({
      data: [{ name: "unrelated-branch" }],
    });
    const res = await POST(uploadRequest({ branch: "main" }));
    const body = await res.json();
    expect(body.branch).toBe("fix/my-post");
    expect(mockedCreateBranch).toHaveBeenCalledWith("fix/my-post");
  });

  it("falls back to the slug for branch/PR naming when the post has no title", async () => {
    mockedGetBlogPost.mockResolvedValue("---\n---\nbody");
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 5,
      isNew: true,
    });
    const res = await POST(uploadRequest({ branch: "main", slug: "my-post" }));
    const body = await res.json();
    expect(mockedCreateBranch).toHaveBeenCalledWith("fix/my-post");
    expect(body.pullRequest.branchName).toBe("fix/my-post");
  });

  it("falls back to the slug for the PR title when fetching the post for PR info fails", async () => {
    mockedGetBlogPost
      .mockResolvedValueOnce('---\ntitle: "My Post"\n---\nbody')
      .mockRejectedValueOnce(new Error("not found"));
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 6,
      isNew: true,
    });
    const res = await POST(uploadRequest({ branch: "main" }));
    expect(res.status).toBe(200);
    expect(mockedCreateOrGetPullRequest).toHaveBeenCalledWith(
      "fix/my-post",
      "fix(blog): my-post",
      expect.stringContaining('"my-post"'),
    );
  });

  it("500s when branch resolution throws on main", async () => {
    octokit.rest.repos.listBranches.mockRejectedValue(new Error("down"));
    const res = await POST(uploadRequest({ branch: "main" }));
    expect(res.status).toBe(500);
  });

  it("400s when a required field is missing", async () => {
    const res = await POST(uploadRequest({ slug: null }));
    expect(res.status).toBe(400);
  });

  it("400s for a file over the 50MB size limit", async () => {
    const big = new File([new Uint8Array(1)], "big.mp4", { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 51 * 1024 * 1024 });
    const res = await POST(uploadRequest({ file: big }));
    expect(res.status).toBe(400);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await POST(uploadRequest({}));
    expect(res.status).toBe(401);
  });

  it("treats a directory-listing getContent response as no existing file", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({ data: [] });
    const res = await POST(uploadRequest({ branch: "feature/x" }));
    expect((await res.json()).message).toBe("File uploaded successfully");
  });

  it("marks the response as updated when the file already exists", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: { type: "file", sha: "existing" },
    });
    const res = await POST(uploadRequest({ branch: "feature/x" }));
    expect((await res.json()).message).toBe("File updated successfully");
  });

  it("continues without a PR when PR creation fails after creating a new branch", async () => {
    mockedCreateOrGetPullRequest.mockRejectedValue(new Error("pr failed"));
    const res = await POST(uploadRequest({ branch: "main" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pullRequest).toBeNull();
  });

  it("500s when an unexpected error occurs outside the handled paths", async () => {
    mockedGetGitHubClient.mockRejectedValue(new Error("boom"));
    const res = await POST(uploadRequest({ branch: "feature/x" }));
    expect(res.status).toBe(500);
  });
});
