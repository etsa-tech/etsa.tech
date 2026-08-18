import { NextRequest } from "next/server";
import {
  exchangeCodeForToken,
  getLinkedInSpeakerConfig,
  getMemberSub,
  getSiteOrigin,
} from "@/lib/linkedin/client";
import { verifyState } from "@/lib/linkedin/state";
import { saveSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";

jest.mock("@/lib/linkedin/client", () => ({
  getLinkedInSpeakerConfig: jest.fn(),
  getSiteOrigin: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  getMemberSub: jest.fn(),
}));
jest.mock("@/lib/linkedin/state", () => ({ verifyState: jest.fn() }));
jest.mock("@/lib/speaker-linkedin-store", () => ({
  saveSpeakerLinkedInUrn: jest.fn(),
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
  jest.mocked(getLinkedInSpeakerConfig).mockReturnValue({
    clientId: "client-id",
    clientSecret: "secret",
  });
  jest.mocked(getSiteOrigin).mockReturnValue("http://localhost:3000");
  jest.mocked(verifyState).mockReturnValue({
    purpose: "speaker-connect",
    slug: "my-talk",
    speakerName: "Jane Doe",
  });
  jest
    .mocked(exchangeCodeForToken)
    .mockResolvedValue({ accessToken: "access-token" });
  jest.mocked(getMemberSub).mockResolvedValue("member-999");
  jest.mocked(saveSpeakerLinkedInUrn).mockResolvedValue(undefined);
});

describe("linkedin speaker callback route (public, no admin session)", () => {
  it("is reachable without an admin session and lands on the public confirmation page", async () => {
    const res = await GET(
      getRequest("/api/posts/social/linkedin/speaker/callback?code=c&state=s"),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/linkedin-connected?");
    expect(locationParam(res, "status")).toBe("success");
    expect(locationParam(res, "speaker")).toBe("Jane Doe");
  });

  it("forwards a LinkedIn-reported error", async () => {
    const res = await GET(
      getRequest(
        "/api/posts/social/linkedin/speaker/callback?error=access_denied",
      ),
    );
    expect(locationParam(res, "status")).toBe("error");
    expect(locationParam(res, "error")).toBe("access_denied");
  });

  it("rejects a request with no state param at all", async () => {
    const res = await GET(
      getRequest("/api/posts/social/linkedin/speaker/callback?code=c"),
    );
    expect(locationParam(res, "error")).toBe("invalid_state");
  });

  it("rejects a missing code", async () => {
    const res = await GET(
      getRequest("/api/posts/social/linkedin/speaker/callback?state=s"),
    );
    expect(locationParam(res, "error")).toBe("invalid_state");
  });

  it("rejects state that fails verification", async () => {
    jest.mocked(verifyState).mockReturnValue(null);
    const res = await GET(
      getRequest(
        "/api/posts/social/linkedin/speaker/callback?code=c&state=bad",
      ),
    );
    expect(locationParam(res, "error")).toBe("invalid_state");
  });

  it("rejects a state with the wrong purpose", async () => {
    jest
      .mocked(verifyState)
      .mockReturnValue({ purpose: "post", slug: "my-talk" });
    const res = await GET(
      getRequest("/api/posts/social/linkedin/speaker/callback?code=c&state=s"),
    );
    expect(locationParam(res, "error")).toBe("invalid_state");
  });

  it("saves the captured urn with no connecting-admin identity, using the exact fixed redirect_uri", async () => {
    const res = await GET(
      getRequest("/api/posts/social/linkedin/speaker/callback?code=c&state=s"),
    );
    expect(locationParam(res, "speaker")).toBe("Jane Doe");
    expect(exchangeCodeForToken).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri:
          "http://localhost:3000/api/posts/social/linkedin/speaker/callback",
      }),
    );
    expect(saveSpeakerLinkedInUrn).toHaveBeenCalledWith(
      "Jane Doe",
      "member-999",
      null,
    );
  });

  it("redirects with connect_failed when an unexpected error occurs", async () => {
    jest.mocked(getMemberSub).mockRejectedValue(new Error("LinkedIn is down"));
    const res = await GET(
      getRequest("/api/posts/social/linkedin/speaker/callback?code=c&state=s"),
    );
    expect(locationParam(res, "error")).toBe("connect_failed");
  });
});
