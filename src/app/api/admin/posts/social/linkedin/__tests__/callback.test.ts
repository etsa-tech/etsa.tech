import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  createOrganizationPost,
  exchangeCodeForToken,
  getLinkedInOrgConfig,
  getSiteOrigin,
  verifyOrganizationAdmin,
} from "@/lib/linkedin/client";
import { verifyState } from "@/lib/linkedin/state";
import { buildDefaultLinkedInCommentary } from "@/lib/linkedin/default-commentary";
import { saveCachedSocialRecord } from "@/lib/social-cache";
import {
  deleteLinkedInPostDraft,
  getLinkedInPostDraft,
} from "@/lib/linkedin-post-draft-store";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/linkedin/client", () => ({
  getLinkedInOrgConfig: jest.fn(),
  getSiteOrigin: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  verifyOrganizationAdmin: jest.fn(),
  createOrganizationPost: jest.fn(),
}));
jest.mock("@/lib/linkedin/state", () => ({ verifyState: jest.fn() }));
jest.mock("@/lib/linkedin/default-commentary", () => ({
  buildDefaultLinkedInCommentary: jest.fn(),
}));
jest.mock("@/lib/social-cache", () => ({ saveCachedSocialRecord: jest.fn() }));
jest.mock("@/lib/linkedin-post-draft-store", () => ({
  getLinkedInPostDraft: jest.fn(),
  deleteLinkedInPostDraft: jest.fn(),
}));

import { GET } from "../callback/route";

function getRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method: "GET" });
}

function locationParam(res: Response, key: string): string | null {
  const location = res.headers.get("location");
  return location ? new URL(location).searchParams.get(key) : null;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getServerSession).mockResolvedValue({
    user: { email: "organizer@etsa.tech" },
  } as never);
  jest.mocked(isAuthorizedUser).mockReturnValue(true);
  jest.mocked(getLinkedInOrgConfig).mockReturnValue({
    clientId: "client-id",
    clientSecret: "secret",
    organizationId: "12345",
  });
  jest.mocked(getSiteOrigin).mockReturnValue("http://localhost:3000");
  jest
    .mocked(verifyState)
    .mockReturnValue({ purpose: "post", slug: "my-talk" });
  jest
    .mocked(exchangeCodeForToken)
    .mockResolvedValue({ accessToken: "access-token" });
  jest.mocked(verifyOrganizationAdmin).mockResolvedValue(true);
  jest.mocked(getLinkedInPostDraft).mockResolvedValue(null);
  jest
    .mocked(buildDefaultLinkedInCommentary)
    .mockResolvedValue("auto-generated post text");
  jest.mocked(deleteLinkedInPostDraft).mockResolvedValue(undefined);
  jest.mocked(createOrganizationPost).mockResolvedValue({
    postUrn: "urn:li:share:abc",
    postUrl: "https://www.linkedin.com/feed/update/urn:li:share:abc/",
  });
  jest.mocked(saveCachedSocialRecord).mockResolvedValue({} as never);
});

describe("linkedin callback route (fixed path)", () => {
  it("redirects to the generic posts hub when state can't be resolved and the user is unauthorized", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    jest.mocked(verifyState).mockReturnValue(null);
    const res = await GET(
      getRequest("/api/admin/posts/social/linkedin/callback"),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/posts?");
    expect(locationParam(res, "linkedin_error")).toBe("unauthorized");
  });

  it("redirects to the post's social page (from state) when unauthorized", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?code=c&state=s"),
    );
    expect(res.headers.get("location")).toContain(
      "/admin/posts/my-talk/social?",
    );
    expect(locationParam(res, "linkedin_error")).toBe("unauthorized");
  });

  it("forwards a LinkedIn-reported error", async () => {
    const res = await GET(
      getRequest(
        "/api/admin/posts/social/linkedin/callback?error=access_denied&state=s",
      ),
    );
    expect(locationParam(res, "linkedin_error")).toBe("access_denied");
  });

  it("rejects a missing code", async () => {
    const res = await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?state=s"),
    );
    expect(locationParam(res, "linkedin_error")).toBe("invalid_state");
  });

  it("rejects a request with no state param at all", async () => {
    const res = await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?code=c"),
    );
    expect(locationParam(res, "linkedin_error")).toBe("invalid_state");
  });

  it("rejects when state fails verification", async () => {
    jest.mocked(verifyState).mockReturnValue(null);
    const res = await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?code=c&state=bad"),
    );
    expect(locationParam(res, "linkedin_error")).toBe("invalid_state");
  });

  it("rejects a state with the wrong purpose", async () => {
    jest.mocked(verifyState).mockReturnValue({
      purpose: "speaker-connect",
      slug: "my-talk",
      speakerName: "Jane Doe",
    });
    const res = await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?code=c&state=s"),
    );
    expect(locationParam(res, "linkedin_error")).toBe("invalid_state");
  });

  it("rejects a member who does not administer the org page", async () => {
    jest.mocked(verifyOrganizationAdmin).mockResolvedValue(false);
    const res = await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?code=c&state=s"),
    );
    expect(locationParam(res, "linkedin_error")).toBe("not_org_admin");
    expect(createOrganizationPost).not.toHaveBeenCalled();
  });

  it("posts the auto-generated template and caches the result on success, using the exact fixed redirect_uri", async () => {
    const res = await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?code=c&state=s"),
    );

    expect(locationParam(res, "linkedin_success")).toBe("1");
    expect(exchangeCodeForToken).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri:
          "http://localhost:3000/api/admin/posts/social/linkedin/callback",
      }),
    );
    expect(createOrganizationPost).toHaveBeenCalledWith(
      expect.objectContaining({ commentary: "auto-generated post text" }),
    );
    expect(saveCachedSocialRecord).toHaveBeenCalledWith(
      "my-talk",
      "linkedin",
      expect.objectContaining({
        campaignId: "urn:li:share:abc",
        campaignUrl: "https://www.linkedin.com/feed/update/urn:li:share:abc/",
        status: "sent",
        sentBy: "organizer@etsa.tech",
      }),
      "organizer@etsa.tech",
    );
    expect(deleteLinkedInPostDraft).toHaveBeenCalledWith("my-talk");
  });

  it("posts the saved draft instead of the auto-generated template when one exists", async () => {
    jest
      .mocked(getLinkedInPostDraft)
      .mockResolvedValue("admin-edited post text");
    await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?code=c&state=s"),
    );
    expect(createOrganizationPost).toHaveBeenCalledWith(
      expect.objectContaining({ commentary: "admin-edited post text" }),
    );
    expect(buildDefaultLinkedInCommentary).not.toHaveBeenCalled();
  });

  it("records a null sentBy when the session has no email", async () => {
    jest.mocked(getServerSession).mockResolvedValue({ user: {} } as never);
    await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?code=c&state=s"),
    );
    expect(saveCachedSocialRecord).toHaveBeenCalledWith(
      "my-talk",
      "linkedin",
      expect.objectContaining({ sentBy: null }),
      null,
    );
  });

  it("redirects with post_failed when an unexpected error occurs", async () => {
    jest
      .mocked(exchangeCodeForToken)
      .mockRejectedValue(new Error("LinkedIn is down"));
    const res = await GET(
      getRequest("/api/admin/posts/social/linkedin/callback?code=c&state=s"),
    );
    expect(locationParam(res, "linkedin_error")).toBe("post_failed");
  });
});
