import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  getBlogPost,
  createOrUpdateFile,
  createOrGetPullRequest,
  enableAutoMergeForPR,
} from "@/lib/github";
import { getRepoInfo } from "@/lib/github-app";
import { resolveBranchForEdit } from "@/lib/post-branch";
import { formatBlogPostContent } from "@/lib/server-only-formatter";
import { getSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github", () => ({
  getBlogPost: jest.fn(),
  createOrUpdateFile: jest.fn(),
  createOrGetPullRequest: jest.fn(),
  enableAutoMergeForPR: jest.fn(),
}));
jest.mock("@/lib/github-app", () => ({ getRepoInfo: jest.fn() }));
jest.mock("@/lib/post-branch", () => ({ resolveBranchForEdit: jest.fn() }));
jest.mock("@/lib/server-only-formatter", () => ({
  formatBlogPostContent: jest.fn((s: string) => Promise.resolve(s)),
}));
jest.mock("@/lib/speaker-linkedin-store", () => ({
  getSpeakerLinkedInUrn: jest.fn(),
}));

import { POST } from "../route";

function ctx(slug = "my-talk") {
  return { params: Promise.resolve({ slug }) };
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/x", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getServerSession).mockResolvedValue({
    user: { name: "Jane", email: "organizer@etsa.tech" },
  } as never);
  jest.mocked(isAuthorizedUser).mockReturnValue(true);
  jest
    .mocked(getBlogPost)
    .mockResolvedValue(
      '---\ntitle: "My Talk"\nspeakers:\n  - name: Jane Doe\n    linkedIn: https://linkedin.com/in/jd\n---\nbody',
    );
  jest.mocked(getSpeakerLinkedInUrn).mockResolvedValue("member-999");
  jest.mocked(resolveBranchForEdit).mockResolvedValue({
    branchName: "fix/my-talk",
    fileSha: "sha1",
    sanitizedTitle: "my-talk",
  });
  jest
    .mocked(createOrGetPullRequest)
    .mockResolvedValue({ prNumber: 42, isNew: true });
  jest.mocked(enableAutoMergeForPR).mockResolvedValue(true);
  jest
    .mocked(getRepoInfo)
    .mockReturnValue({ owner: "etsa", repo: "etsa.tech" });
});

describe("linkedin speaker promote route", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(res.status).toBe(401);
  });

  it("rejects a missing speaker name", async () => {
    const res = await POST(postReq({}), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Missing speaker name");
  });

  it("rejects a non-string speaker value", async () => {
    const res = await POST(postReq({ speaker: 123 }), ctx());
    expect(res.status).toBe(400);
  });

  it("rejects a speaker not listed on this post", async () => {
    const res = await POST(postReq({ speaker: "Someone Else" }), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Unknown speaker for this post");
  });

  it("rejects a speaker who hasn't connected LinkedIn yet", async () => {
    jest.mocked(getSpeakerLinkedInUrn).mockResolvedValue(null);
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "Speaker has not connected LinkedIn yet",
    );
    expect(createOrUpdateFile).not.toHaveBeenCalled();
  });

  it("skips opening a PR when frontmatter already has this exact urn", async () => {
    jest
      .mocked(getBlogPost)
      .mockResolvedValue(
        '---\ntitle: "My Talk"\nspeakers:\n  - name: Jane Doe\n    linkedInUrn: member-999\n---\nbody',
      );
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, alreadyPromoted: true });
    expect(resolveBranchForEdit).not.toHaveBeenCalled();
    expect(createOrUpdateFile).not.toHaveBeenCalled();
    expect(createOrGetPullRequest).not.toHaveBeenCalled();
  });

  it("still promotes when frontmatter has a different (stale) urn for this speaker", async () => {
    jest
      .mocked(getBlogPost)
      .mockResolvedValue(
        '---\ntitle: "My Talk"\nspeakers:\n  - name: Jane Doe\n    linkedInUrn: old-urn\n---\nbody',
      );
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    const [, fullContent] = jest.mocked(createOrUpdateFile).mock.calls[0];
    expect(fullContent).toContain("member-999");
    expect(fullContent).not.toContain("old-urn");
  });

  it("writes the urn into the matching speakers[] entry, opens a PR, and enables auto-merge", async () => {
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      prNumber: 42,
      prUrl: "https://github.com/etsa/etsa.tech/pull/42",
      isNewPR: true,
      autoMergeEnabled: true,
    });
    expect(enableAutoMergeForPR).toHaveBeenCalledWith(42);

    const [, fullContent] = jest.mocked(createOrUpdateFile).mock.calls[0];
    expect(fullContent).toContain("linkedInUrn");
    expect(fullContent).toContain("member-999");
  });

  it("follows the same fix(blog): <title> PR-title convention the post editor uses, with a suffix marking it as the LinkedIn sync", async () => {
    await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(createOrGetPullRequest).toHaveBeenCalledWith(
      "fix/my-talk",
      "fix(blog): my-talk - linkedin to frontmatter",
      expect.any(String),
    );
    expect(createOrUpdateFile).toHaveBeenCalledWith(
      "posts/my-talk.md",
      expect.any(String),
      "Update blog post: My Talk - LinkedIn to frontmatter",
      "sha1",
      "fix/my-talk",
    );
  });

  it("reports when auto-merge could not be enabled", async () => {
    jest.mocked(enableAutoMergeForPR).mockResolvedValue(false);
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect((await res.json()).autoMergeEnabled).toBe(false);
  });

  it("writes to the legacy speakerLinkedInUrn field for single-speaker posts", async () => {
    jest
      .mocked(getBlogPost)
      .mockResolvedValue(
        '---\ntitle: "My Talk"\nspeakerName: Jane Doe\n---\nbody',
      );
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(res.status).toBe(200);
    const [, fullContent] = jest.mocked(createOrUpdateFile).mock.calls[0];
    expect(fullContent).toContain("speakerLinkedInUrn");
    expect(fullContent).toContain("member-999");
  });

  it("falls back to the slug for the PR title/commit message when frontmatter has no title", async () => {
    jest
      .mocked(getBlogPost)
      .mockResolvedValue("---\nspeakerName: Jane Doe\n---\nbody");
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(res.status).toBe(200);
    expect(resolveBranchForEdit).toHaveBeenCalledWith("my-talk", "my-talk");
  });

  it("falls back to the legacy field when speakers[] exists but doesn't contain the matched (legacy-field) speaker", async () => {
    jest
      .mocked(getBlogPost)
      .mockResolvedValue(
        '---\ntitle: "My Talk"\nspeakerName: Jane Doe\nspeakers:\n  - name: Someone Else\n---\nbody',
      );
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(res.status).toBe(200);
    const [, fullContent] = jest.mocked(createOrUpdateFile).mock.calls[0];
    expect(fullContent).toContain("speakerLinkedInUrn");
  });

  it("reuses an existing PR instead of always creating a new one", async () => {
    jest
      .mocked(createOrGetPullRequest)
      .mockResolvedValue({ prNumber: 7, isNew: false });
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect((await res.json()).isNewPR).toBe(false);
  });

  it("returns 500 when an unexpected error occurs", async () => {
    jest.mocked(getBlogPost).mockRejectedValue(new Error("GitHub is down"));
    const res = await POST(postReq({ speaker: "Jane Doe" }), ctx());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe(
      "Failed to promote LinkedIn to frontmatter",
    );
  });
});
