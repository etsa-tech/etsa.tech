import { getGitHubClient, getRepoInfo } from "@/lib/github-app";

jest.mock("@/lib/github-app", () => ({
  getGitHubClient: jest.fn(),
  getRepoInfo: jest.fn(() => ({ owner: "etsa", repo: "etsa.tech" })),
}));

import {
  getRepoContents,
  getFileContent,
  getFileContentWithSha,
  getBlogPosts,
  getBlogPost,
  getBranches,
  createOrUpdateFile,
  createBranch,
  getPullRequestForBranch,
  getOpenPRForPost,
  createOrGetPullRequest,
  enableAutoMergeForPR,
  createPullRequest,
  uploadAsset,
} from "@/lib/github";

const mockedGetGitHubClient = jest.mocked(getGitHubClient);

// Left loosely typed (no cast to Octokit) so each method stays a jest.Mock
// with mockResolvedValue/mockRejectedValue available - only the value
// handed to getGitHubClient's mock needs to look like a real Octokit.
function octokitStub() {
  return {
    rest: {
      repos: {
        getContent: jest.fn(),
        listBranches: jest.fn(),
        createOrUpdateFileContents: jest.fn(),
      },
      git: { getRef: jest.fn(), createRef: jest.fn() },
      pulls: { list: jest.fn(), create: jest.fn() },
    },
    graphql: jest.fn(),
  };
}

let octokit: ReturnType<typeof octokitStub>;

beforeEach(() => {
  octokit = octokitStub();
  mockedGetGitHubClient.mockResolvedValue(octokit as never);
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe("getRepoContents", () => {
  it("maps a directory listing response", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: [
        { name: "a.md", path: "posts/a.md", sha: "1", size: 10, type: "file" },
      ],
    });
    const files = await getRepoContents("posts");
    expect(files).toEqual([
      { name: "a.md", path: "posts/a.md", sha: "1", size: 10, type: "file" },
    ]);
  });

  it("returns an empty array for a single-file response", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({ data: { name: "a.md" } });
    expect(await getRepoContents("posts/a.md")).toEqual([]);
  });

  it("throws a generic error when the API call fails", async () => {
    octokit.rest.repos.getContent.mockRejectedValue(new Error("rate limited"));
    await expect(getRepoContents("posts")).rejects.toThrow(
      "Failed to fetch repository contents",
    );
  });

  it("defaults the path to the repository root when omitted", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({ data: [] });
    await getRepoContents();
    expect(octokit.rest.repos.getContent).toHaveBeenCalledWith(
      expect.objectContaining({ path: "", ref: "main" }),
    );
  });
});

describe("getFileContent / getFileContentWithSha", () => {
  it("decodes base64 content", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: { content: Buffer.from("hello").toString("base64") },
    });
    expect(await getFileContent("a.md")).toBe("hello");
  });

  it("throws when content is absent on the response", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({ data: {} });
    await expect(getFileContent("a.md")).rejects.toThrow(
      "Failed to fetch file content",
    );
  });

  it("returns content and sha together", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: { content: Buffer.from("hello").toString("base64"), sha: "abc" },
    });
    expect(await getFileContentWithSha("a.md")).toEqual({
      content: "hello",
      sha: "abc",
    });
  });

  it("getFileContentWithSha throws a dedicated error message on failure", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({ data: {} });
    await expect(getFileContentWithSha("a.md")).rejects.toThrow(
      "Failed to fetch file content with SHA",
    );
  });
});

describe("getBlogPosts / getBlogPost", () => {
  it("getBlogPosts lists the posts directory", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({ data: [] });
    await getBlogPosts();
    expect(octokit.rest.repos.getContent).toHaveBeenCalledWith(
      expect.objectContaining({ path: "posts" }),
    );
  });

  it("getBlogPost fetches posts/<slug>.md", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: { content: Buffer.from("md").toString("base64") },
    });
    expect(await getBlogPost("my-slug")).toBe("md");
    expect(octokit.rest.repos.getContent).toHaveBeenCalledWith(
      expect.objectContaining({ path: "posts/my-slug.md" }),
    );
  });
});

describe("getBranches", () => {
  it("returns branch names", async () => {
    octokit.rest.repos.listBranches.mockResolvedValue({
      data: [{ name: "main" }, { name: "dev" }],
    });
    expect(await getBranches()).toEqual(["main", "dev"]);
  });

  it("falls back to ['main'] on error", async () => {
    octokit.rest.repos.listBranches.mockRejectedValue(new Error("down"));
    expect(await getBranches()).toEqual(["main"]);
  });
});

describe("createOrUpdateFile", () => {
  it("base64-encodes content and calls the API", async () => {
    octokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({});
    await createOrUpdateFile("posts/a.md", "content", "msg", "sha1", "branch1");
    expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({
        content: Buffer.from("content").toString("base64"),
        sha: "sha1",
        branch: "branch1",
      }),
    );
  });

  it("throws a generic error on failure", async () => {
    octokit.rest.repos.createOrUpdateFileContents.mockRejectedValue(
      new Error("conflict"),
    );
    await expect(createOrUpdateFile("a.md", "c", "m")).rejects.toThrow(
      "Failed to create or update file",
    );
  });
});

describe("createBranch", () => {
  it("reads main's ref and creates a new one from its sha", async () => {
    octokit.rest.git.getRef.mockResolvedValue({
      data: { object: { sha: "sha1" } },
    });
    octokit.rest.git.createRef.mockResolvedValue({});
    await createBranch("feature/x");
    expect(octokit.rest.git.createRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: "refs/heads/feature/x", sha: "sha1" }),
    );
  });

  it("throws a generic error on failure", async () => {
    octokit.rest.git.getRef.mockRejectedValue(new Error("no such ref"));
    await expect(createBranch("x")).rejects.toThrow("Failed to create branch");
  });
});

describe("getPullRequestForBranch", () => {
  it("returns the PR number when one exists", async () => {
    octokit.rest.pulls.list.mockResolvedValue({ data: [{ number: 7 }] });
    expect(await getPullRequestForBranch("feature/x")).toBe(7);
  });

  it("returns null when no PR is open", async () => {
    octokit.rest.pulls.list.mockResolvedValue({ data: [] });
    expect(await getPullRequestForBranch("feature/x")).toBeNull();
  });

  it("returns null on error", async () => {
    octokit.rest.pulls.list.mockRejectedValue(new Error("down"));
    expect(await getPullRequestForBranch("feature/x")).toBeNull();
  });
});

describe("getOpenPRForPost", () => {
  it("matches a fix/ branch derived from the post title", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: {
        content: Buffer.from('---\ntitle: "My Great Post"\n---\nbody').toString(
          "base64",
        ),
      },
    });
    octokit.rest.pulls.list.mockResolvedValue({
      data: [{ head: { ref: "fix/my-great-post" }, number: 3 }],
    });
    const result = await getOpenPRForPost("my-great-post");
    expect(result).toEqual({ branchName: "fix/my-great-post", prNumber: 3 });
  });

  it("matches a legacy update-post- branch when getBlogPost fails, using the slug", async () => {
    octokit.rest.repos.getContent.mockRejectedValue(new Error("not found"));
    octokit.rest.pulls.list.mockResolvedValue({
      data: [{ head: { ref: "update-post-my-slug-abc123" }, number: 9 }],
    });
    const result = await getOpenPRForPost("my-slug");
    expect(result).toEqual({
      branchName: "update-post-my-slug-abc123",
      prNumber: 9,
    });
  });

  it("returns null when nothing matches", async () => {
    octokit.rest.repos.getContent.mockRejectedValue(new Error("not found"));
    octokit.rest.pulls.list.mockResolvedValue({ data: [] });
    expect(await getOpenPRForPost("my-slug")).toBeNull();
  });

  it("returns null on error", async () => {
    octokit.rest.pulls.list.mockRejectedValue(new Error("down"));
    expect(await getOpenPRForPost("my-slug")).toBeNull();
  });

  it("falls back to the slug for chore/ matching when the post has no title", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: {
        content: Buffer.from("---\nexcerpt: e\n---\nbody").toString("base64"),
      },
    });
    octokit.rest.pulls.list.mockResolvedValue({
      data: [{ head: { ref: "chore/my-slug" }, number: 4 }],
    });
    const result = await getOpenPRForPost("my-slug");
    expect(result).toEqual({ branchName: "chore/my-slug", prNumber: 4 });
  });

  it("matches a new-post- branch pattern", async () => {
    octokit.rest.repos.getContent.mockRejectedValue(new Error("not found"));
    octokit.rest.pulls.list.mockResolvedValue({
      data: [{ head: { ref: "new-post-my-slug-xyz" }, number: 6 }],
    });
    const result = await getOpenPRForPost("my-slug");
    expect(result).toEqual({ branchName: "new-post-my-slug-xyz", prNumber: 6 });
  });

  it("matches an old feature/ branch pattern derived from the date prefix", async () => {
    octokit.rest.repos.getContent.mockRejectedValue(new Error("not found"));
    octokit.rest.pulls.list.mockResolvedValue({
      data: [{ head: { ref: "feature/2026-01-01-extra" }, number: 8 }],
    });
    const result = await getOpenPRForPost("2026-01-01-my-talk");
    expect(result).toEqual({
      branchName: "feature/2026-01-01-extra",
      prNumber: 8,
    });
  });

  it("returns null when an open PR exists but its branch matches none of the patterns", async () => {
    octokit.rest.repos.getContent.mockRejectedValue(new Error("not found"));
    octokit.rest.pulls.list.mockResolvedValue({
      data: [{ head: { ref: "unrelated-branch" }, number: 1 }],
    });
    expect(await getOpenPRForPost("my-slug")).toBeNull();
  });
});

describe("createOrGetPullRequest", () => {
  it("returns the existing PR without creating a new one", async () => {
    octokit.rest.pulls.list.mockResolvedValue({ data: [{ number: 5 }] });
    const result = await createOrGetPullRequest("branch", "title", "body");
    expect(result).toEqual({ prNumber: 5, isNew: false });
    expect(octokit.rest.pulls.create).not.toHaveBeenCalled();
  });

  it("creates a new PR when none exists", async () => {
    octokit.rest.pulls.list.mockResolvedValue({ data: [] });
    octokit.rest.pulls.create.mockResolvedValue({ data: { number: 11 } });
    const result = await createOrGetPullRequest("branch", "title", "body");
    expect(result).toEqual({ prNumber: 11, isNew: true });
  });

  it("throws a generic error when PR creation fails", async () => {
    octokit.rest.pulls.list.mockResolvedValue({ data: [] });
    octokit.rest.pulls.create.mockRejectedValue(new Error("boom"));
    await expect(
      createOrGetPullRequest("branch", "title", "body"),
    ).rejects.toThrow("Failed to create pull request");
  });
});

describe("createPullRequest (legacy)", () => {
  it("delegates to createOrGetPullRequest and returns just the number", async () => {
    octokit.rest.pulls.list.mockResolvedValue({ data: [] });
    octokit.rest.pulls.create.mockResolvedValue({ data: { number: 42 } });
    expect(await createPullRequest("branch", "title", "body")).toBe(42);
  });
});

describe("enableAutoMergeForPR", () => {
  it("returns true on success", async () => {
    octokit.graphql
      .mockResolvedValueOnce({ repository: { pullRequest: { id: "PR_id" } } })
      .mockResolvedValueOnce({});
    expect(await enableAutoMergeForPR(3)).toBe(true);
  });

  it("returns false and swallows the error on failure", async () => {
    octokit.graphql.mockRejectedValue(new Error("auto-merge not allowed"));
    expect(await enableAutoMergeForPR(3)).toBe(false);
  });
});

describe("uploadAsset", () => {
  it("uploads under public/ with base64 content", async () => {
    octokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({});
    await uploadAsset("images/a.png", Buffer.from("bytes"), "msg");
    expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ path: "public/images/a.png" }),
    );
  });

  it("throws a generic error on failure", async () => {
    octokit.rest.repos.createOrUpdateFileContents.mockRejectedValue(
      new Error("boom"),
    );
    await expect(uploadAsset("a.png", Buffer.from("x"), "msg")).rejects.toThrow(
      "Failed to upload asset",
    );
  });
});

describe("getRepoInfo re-export sanity", () => {
  it("is the mocked function", () => {
    expect(getRepoInfo()).toEqual({ owner: "etsa", repo: "etsa.tech" });
  });
});
