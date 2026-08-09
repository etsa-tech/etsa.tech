import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  buildAuthorizeUrl,
  getLinkedInOrgConfig,
  getSiteOrigin,
} from "@/lib/linkedin/client";
import { signState } from "@/lib/linkedin/state";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/linkedin/client", () => ({
  getLinkedInOrgConfig: jest.fn(),
  getSiteOrigin: jest.fn(),
  buildAuthorizeUrl: jest.fn(),
}));
jest.mock("@/lib/linkedin/state", () => ({ signState: jest.fn() }));

import { GET } from "../authorize/route";

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
  jest.mocked(getLinkedInOrgConfig).mockReturnValue({
    clientId: "client-id",
    clientSecret: "secret",
    organizationId: "12345",
  });
  jest.mocked(getSiteOrigin).mockReturnValue("http://localhost:3000");
  jest.mocked(signState).mockReturnValue("signed-state");
  jest
    .mocked(buildAuthorizeUrl)
    .mockReturnValue("https://www.linkedin.com/oauth/v2/authorization?mock=1");
});

describe("linkedin authorize route", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/authorize"),
      routeParams(),
    );
    expect(res.status).toBe(401);
  });

  it("redirects to the built LinkedIn authorize url", async () => {
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/authorize"),
      routeParams(),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://www.linkedin.com/oauth/v2/authorization?mock=1",
    );
    expect(signState).toHaveBeenCalledWith({
      purpose: "post",
      slug: "my-talk",
    });
    expect(buildAuthorizeUrl).toHaveBeenCalledWith({
      clientId: "client-id",
      redirectUri:
        "http://localhost:3000/api/admin/posts/social/linkedin/callback",
      state: "signed-state",
      scope: "w_organization_social",
    });
  });

  it("returns 500 when LinkedIn configuration is missing", async () => {
    jest.mocked(getLinkedInOrgConfig).mockImplementation(() => {
      throw new Error("LinkedIn organization app configuration missing");
    });
    const res = await GET(
      getRequest("/api/admin/posts/my-talk/social/linkedin/authorize"),
      routeParams(),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe(
      "Failed to start LinkedIn authorization",
    );
  });
});
