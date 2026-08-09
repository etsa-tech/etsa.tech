import { NextRequest } from "next/server";
import {
  buildAuthorizeUrl,
  getLinkedInSpeakerConfig,
  getSiteOrigin,
} from "@/lib/linkedin/client";
import { signState } from "@/lib/linkedin/state";
import { getPublishedPostFrontmatter } from "@/lib/social/post-data";
import { getPostSpeakers } from "@/lib/utils";

jest.mock("@/lib/linkedin/client", () => ({
  getLinkedInSpeakerConfig: jest.fn(),
  getSiteOrigin: jest.fn(),
  buildAuthorizeUrl: jest.fn(),
}));
jest.mock("@/lib/linkedin/state", () => ({ signState: jest.fn() }));
jest.mock("@/lib/social/post-data", () => ({
  getPublishedPostFrontmatter: jest.fn(),
}));
jest.mock("@/lib/utils", () => ({ getPostSpeakers: jest.fn() }));

import { GET } from "../authorize/route";

function routeParams(slug = "my-talk") {
  return { params: Promise.resolve({ slug }) };
}

function getRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method: "GET" });
}

function locationParam(res: Response, key: string): string | null {
  const location = res.headers.get("location");
  return location ? new URL(location).searchParams.get(key) : null;
}

beforeEach(() => {
  jest.mocked(getLinkedInSpeakerConfig).mockReturnValue({
    clientId: "client-id",
    clientSecret: "secret",
  });
  jest.mocked(getSiteOrigin).mockReturnValue("http://localhost:3000");
  jest.mocked(signState).mockReturnValue("signed-state");
  jest
    .mocked(buildAuthorizeUrl)
    .mockReturnValue("https://www.linkedin.com/oauth/v2/authorization?mock=1");
  jest.mocked(getPublishedPostFrontmatter).mockResolvedValue({
    title: "My Talk",
  } as never);
  jest.mocked(getPostSpeakers).mockReturnValue([{ name: "Jane Doe" }]);
});

describe("linkedin speaker authorize route", () => {
  it("is reachable without an admin session - the speaker isn't an ETSA admin", async () => {
    const res = await GET(
      getRequest(
        "/api/admin/posts/my-talk/social/linkedin/speaker/authorize?speaker=Jane%20Doe",
      ),
      routeParams(),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://www.linkedin.com/oauth/v2/authorization?mock=1",
    );
  });

  it("redirects to the public error page on a missing speaker query param", async () => {
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/speaker/authorize"),
      routeParams(),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/linkedin-connected?");
    expect(locationParam(res, "status")).toBe("error");
    expect(locationParam(res, "error")).toBe("missing_speaker");
  });

  it("redirects to the public error page for a speaker not listed on this post", async () => {
    const res = await GET(
      getRequest(
        "/api/admin/posts/my-talk/social/linkedin/speaker/authorize?speaker=Someone%20Else",
      ),
      routeParams(),
    );
    expect(locationParam(res, "error")).toBe("unknown_speaker");
  });

  it("matches speaker names case-insensitively", async () => {
    const res = await GET(
      getRequest(
        "/api/admin/posts/my-talk/social/linkedin/speaker/authorize?speaker=jane%20doe",
      ),
      routeParams(),
    );
    expect(res.headers.get("location")).toBe(
      "https://www.linkedin.com/oauth/v2/authorization?mock=1",
    );
  });

  it("redirects to the built LinkedIn authorize url with openid/profile scope", async () => {
    const res = await GET(
      getRequest(
        "/api/admin/posts/my-talk/social/linkedin/speaker/authorize?speaker=Jane%20Doe",
      ),
      routeParams(),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://www.linkedin.com/oauth/v2/authorization?mock=1",
    );
    expect(signState).toHaveBeenCalledWith({
      purpose: "speaker-connect",
      slug: "my-talk",
      speakerName: "Jane Doe",
    });
    expect(buildAuthorizeUrl).toHaveBeenCalledWith({
      clientId: "client-id",
      redirectUri:
        "http://localhost:3000/api/admin/posts/social/linkedin/speaker/callback",
      state: "signed-state",
      scope: "openid profile",
    });
  });

  it("redirects to the public error page when an unexpected error occurs", async () => {
    jest
      .mocked(getPublishedPostFrontmatter)
      .mockRejectedValue(new Error("GitHub is down"));
    const res = await GET(
      getRequest(
        "/api/admin/posts/my-talk/social/linkedin/speaker/authorize?speaker=Jane%20Doe",
      ),
      routeParams(),
    );
    expect(locationParam(res, "error")).toBe("start_failed");
  });
});
