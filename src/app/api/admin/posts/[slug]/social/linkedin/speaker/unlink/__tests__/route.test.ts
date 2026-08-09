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
import { deleteSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";

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
  deleteSpeakerLinkedInUrn: jest.fn(),
}));

import { POST } from "../route";

function routeParams(slug = "my-talk") {
  return { params: Promise.resolve({ slug }) };
}

function postRequest(path: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
  jest.mocked(deleteSpeakerLinkedInUrn).mockResolvedValue(undefined);
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

describe("linkedin speaker unlink route", () => {
  it("rejects unauthorized users - unlinking is a board decision", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await POST(
      postRequest("/api/admin/posts/my-talk/social/linkedin/speaker/unlink", {
        speaker: "Jane Doe",
      }),
      routeParams(),
    );
    expect(res.status).toBe(401);
    expect(deleteSpeakerLinkedInUrn).not.toHaveBeenCalled();
  });

  it("rejects a missing speaker name", async () => {
    const res = await POST(
      postRequest(
        "/api/admin/posts/my-talk/social/linkedin/speaker/unlink",
        {},
      ),
      routeParams(),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Missing speaker name");
  });

  it("rejects a non-string speaker value", async () => {
    const res = await POST(
      postRequest("/api/admin/posts/my-talk/social/linkedin/speaker/unlink", {
        speaker: 123,
      }),
      routeParams(),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a speaker not listed on this post", async () => {
    const res = await POST(
      postRequest("/api/admin/posts/my-talk/social/linkedin/speaker/unlink", {
        speaker: "Someone Else",
      }),
      routeParams(),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Unknown speaker for this post");
    expect(deleteSpeakerLinkedInUrn).not.toHaveBeenCalled();
  });

  it("deletes the stored urn and reports no frontmatter change when frontmatter never had a urn", async () => {
    const res = await POST(
      postRequest("/api/admin/posts/my-talk/social/linkedin/speaker/unlink", {
        speaker: "Jane Doe",
      }),
      routeParams(),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      frontmatterCleared: false,
    });
    expect(deleteSpeakerLinkedInUrn).toHaveBeenCalledWith("Jane Doe");
    expect(createOrUpdateFile).not.toHaveBeenCalled();
    expect(createOrGetPullRequest).not.toHaveBeenCalled();
  });

  it("also clears a previously-promoted urn from frontmatter via an auto-merged PR", async () => {
    jest
      .mocked(getBlogPost)
      .mockResolvedValue(
        '---\ntitle: "My Talk"\nspeakers:\n  - name: Jane Doe\n    linkedInUrn: member-999\n---\nbody',
      );
    const res = await POST(
      postRequest("/api/admin/posts/my-talk/social/linkedin/speaker/unlink", {
        speaker: "Jane Doe",
      }),
      routeParams(),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      frontmatterCleared: true,
      prNumber: 42,
      prUrl: "https://github.com/etsa/etsa.tech/pull/42",
      isNewPR: true,
      autoMergeEnabled: true,
    });

    const [, fullContent] = jest.mocked(createOrUpdateFile).mock.calls[0];
    expect(fullContent).not.toContain("member-999");
    expect(createOrGetPullRequest).toHaveBeenCalledWith(
      "fix/my-talk",
      "fix(blog): my-talk - remove linkedin from frontmatter",
      expect.any(String),
    );
    expect(enableAutoMergeForPR).toHaveBeenCalledWith(42);
  });

  it("also clears the legacy speakerLinkedInUrn field when present", async () => {
    jest
      .mocked(getBlogPost)
      .mockResolvedValue(
        '---\ntitle: "My Talk"\nspeakerName: Jane Doe\nspeakerLinkedInUrn: member-999\n---\nbody',
      );
    const res = await POST(
      postRequest("/api/admin/posts/my-talk/social/linkedin/speaker/unlink", {
        speaker: "Jane Doe",
      }),
      routeParams(),
    );
    expect((await res.json()).frontmatterCleared).toBe(true);
    const [, fullContent] = jest.mocked(createOrUpdateFile).mock.calls[0];
    expect(fullContent).not.toContain("speakerLinkedInUrn");
  });

  it("falls back to the slug for the PR title/commit message when frontmatter has no title", async () => {
    jest
      .mocked(getBlogPost)
      .mockResolvedValue(
        "---\nspeakerName: Jane Doe\nspeakerLinkedInUrn: member-999\n---\nbody",
      );
    const res = await POST(
      postRequest("/api/admin/posts/my-talk/social/linkedin/speaker/unlink", {
        speaker: "Jane Doe",
      }),
      routeParams(),
    );
    expect(res.status).toBe(200);
    expect(resolveBranchForEdit).toHaveBeenCalledWith("my-talk", "my-talk");
  });

  it("returns 500 when an unexpected error occurs", async () => {
    jest
      .mocked(deleteSpeakerLinkedInUrn)
      .mockRejectedValue(new Error("Blobs is down"));
    const res = await POST(
      postRequest("/api/admin/posts/my-talk/social/linkedin/speaker/unlink", {
        speaker: "Jane Doe",
      }),
      routeParams(),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to unlink LinkedIn");
  });
});
