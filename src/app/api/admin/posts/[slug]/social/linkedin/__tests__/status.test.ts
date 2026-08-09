import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getCachedSocialRecord } from "@/lib/social-cache";
import { getSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/social-cache", () => ({ getCachedSocialRecord: jest.fn() }));
jest.mock("@/lib/speaker-linkedin-store", () => ({
  getSpeakerLinkedInUrn: jest.fn(),
}));

import { GET } from "../status/route";

function routeParams(slug = "my-talk") {
  return { params: Promise.resolve({ slug }) };
}

function getRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method: "GET" });
}

beforeEach(() => {
  jest.mocked(getServerSession).mockResolvedValue({
    user: { email: "organizer@etsa.tech" },
  } as never);
  jest.mocked(isAuthorizedUser).mockReturnValue(true);
  jest.mocked(getCachedSocialRecord).mockResolvedValue(null);
  jest.mocked(getSpeakerLinkedInUrn).mockResolvedValue(null);
});

describe("linkedin status route", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/status"),
      routeParams(),
    );
    expect(res.status).toBe(401);
  });

  it("does not look up a speaker urn when no speaker query param is given", async () => {
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/status"),
      routeParams(),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      cached: null,
      speakerConnected: false,
      speakerUrn: null,
    });
    expect(getSpeakerLinkedInUrn).not.toHaveBeenCalled();
  });

  it("reports speakerConnected true and the raw urn when one is on file", async () => {
    jest.mocked(getSpeakerLinkedInUrn).mockResolvedValue("member-123");
    const res = await GET(
      getRequest(
        "/api/admin/posts/my-talk/social/linkedin/status?speaker=Jane%20Doe",
      ),
      routeParams(),
    );
    expect(await res.json()).toEqual({
      cached: null,
      speakerConnected: true,
      speakerUrn: "member-123",
    });
    expect(getSpeakerLinkedInUrn).toHaveBeenCalledWith("Jane Doe");
  });

  it("returns the cached record when present", async () => {
    jest.mocked(getCachedSocialRecord).mockResolvedValue({
      provider: "linkedin",
      campaignId: "urn:li:share:abc",
      campaignUrl: "https://www.linkedin.com/feed/update/urn:li:share:abc/",
      status: "sent",
      testRecipients: [],
      sentAt: "2026-01-01T00:00:00.000Z",
      sentBy: "organizer@etsa.tech",
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: "organizer@etsa.tech",
    });
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/status"),
      routeParams(),
    );
    const { cached } = await res.json();
    expect(cached.status).toBe("sent");
  });

  it("returns 500 when the cache lookup throws", async () => {
    jest
      .mocked(getCachedSocialRecord)
      .mockRejectedValue(new Error("Blobs is down"));
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/status"),
      routeParams(),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to load LinkedIn status");
  });
});
