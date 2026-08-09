import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { buildDefaultLinkedInCommentary } from "@/lib/linkedin/default-commentary";
import {
  getLinkedInPostDraft,
  saveLinkedInPostDraft,
} from "@/lib/linkedin-post-draft-store";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/linkedin/default-commentary", () => ({
  buildDefaultLinkedInCommentary: jest.fn(),
}));
jest.mock("@/lib/linkedin-post-draft-store", () => ({
  getLinkedInPostDraft: jest.fn(),
  saveLinkedInPostDraft: jest.fn(),
}));

import { GET, POST } from "../route";

function ctx(slug = "my-talk") {
  return { params: Promise.resolve({ slug }) };
}

function getRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method: "GET" });
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/x", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getServerSession).mockResolvedValue({
    user: { email: "organizer@etsa.tech" },
  } as never);
  jest.mocked(isAuthorizedUser).mockReturnValue(true);
  jest.mocked(getLinkedInPostDraft).mockResolvedValue(null);
  jest
    .mocked(buildDefaultLinkedInCommentary)
    .mockResolvedValue("auto-generated template");
  jest.mocked(saveLinkedInPostDraft).mockResolvedValue(undefined);
});

describe("linkedin draft route GET", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/draft"),
      ctx(),
    );
    expect(res.status).toBe(401);
  });

  it("returns the auto-generated template with isDraft false when nothing is saved", async () => {
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/draft"),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      commentary: "auto-generated template",
      isDraft: false,
    });
  });

  it("returns the saved draft with isDraft true when one exists", async () => {
    jest.mocked(getLinkedInPostDraft).mockResolvedValue("edited text");
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/draft"),
      ctx(),
    );
    expect(await res.json()).toEqual({
      commentary: "edited text",
      isDraft: true,
    });
    expect(buildDefaultLinkedInCommentary).not.toHaveBeenCalled();
  });

  it("ignores a saved draft and returns the fresh template when ?fresh=1 is set", async () => {
    jest.mocked(getLinkedInPostDraft).mockResolvedValue("edited text");
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/draft?fresh=1"),
      ctx(),
    );
    expect(await res.json()).toEqual({
      commentary: "auto-generated template",
      isDraft: false,
    });
    expect(getLinkedInPostDraft).not.toHaveBeenCalled();
  });

  it("returns 500 when an unexpected error occurs", async () => {
    jest
      .mocked(buildDefaultLinkedInCommentary)
      .mockRejectedValue(new Error("GitHub is down"));
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/draft"),
      ctx(),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to load LinkedIn post draft");
  });
});

describe("linkedin draft route POST", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await POST(postRequest({ commentary: "text" }), ctx());
    expect(res.status).toBe(401);
    expect(saveLinkedInPostDraft).not.toHaveBeenCalled();
  });

  it("rejects an empty commentary", async () => {
    const res = await POST(postRequest({ commentary: "   " }), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Post text can't be empty");
  });

  it("rejects a missing commentary field", async () => {
    const res = await POST(postRequest({}), ctx());
    expect(res.status).toBe(400);
  });

  it("rejects a non-string commentary value", async () => {
    const res = await POST(postRequest({ commentary: 123 }), ctx());
    expect(res.status).toBe(400);
  });

  it("rejects commentary over LinkedIn's 3000-character limit", async () => {
    const res = await POST(
      postRequest({ commentary: "x".repeat(3001) }),
      ctx(),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/3000-character limit/);
  });

  it("accepts commentary at exactly the 3000-character limit", async () => {
    const res = await POST(
      postRequest({ commentary: "x".repeat(3000) }),
      ctx(),
    );
    expect(res.status).toBe(200);
  });

  it("saves the draft on success", async () => {
    const res = await POST(
      postRequest({ commentary: "Edited post text" }),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(saveLinkedInPostDraft).toHaveBeenCalledWith(
      "my-talk",
      "Edited post text",
      "organizer@etsa.tech",
    );
  });

  it("saves a null updatedBy when the session has no email", async () => {
    jest.mocked(getServerSession).mockResolvedValue({ user: {} } as never);
    await POST(postRequest({ commentary: "Edited post text" }), ctx());
    expect(saveLinkedInPostDraft).toHaveBeenCalledWith(
      "my-talk",
      "Edited post text",
      null,
    );
  });

  it("returns 500 when an unexpected error occurs", async () => {
    jest
      .mocked(saveLinkedInPostDraft)
      .mockRejectedValue(new Error("Blobs is down"));
    const res = await POST(postRequest({ commentary: "text" }), ctx());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to save LinkedIn post draft");
  });
});
