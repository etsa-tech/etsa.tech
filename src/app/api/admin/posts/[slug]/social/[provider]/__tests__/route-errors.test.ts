/**
 * Coverage for the branches send-gate.test.ts doesn't exercise: validation
 * failures and provider-thrown errors across draft/test/send, plus the
 * search and status routes (not touched by the gate-flow test at all).
 */
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { mailchimpProvider as mockMailchimpProvider } from "@/lib/social/mailchimp";
import {
  getCachedSocialRecord as mockGetCachedSocialRecord,
  saveCachedSocialRecord as mockSaveCachedSocialRecord,
} from "@/lib/social-cache";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/auth-utils", () => ({
  isAuthorizedUser: jest.fn(() => true),
}));

jest.mock("@/lib/social/post-data", () => ({
  getPublishedPostFrontmatter: jest
    .fn()
    .mockResolvedValue({ title: "Test Talk" }),
  getSocialDraftContent: jest.fn().mockResolvedValue({
    title: "Test Talk",
    bio: "Speaker bio",
    date: "2026-01-01",
    abstract: "Talk abstract",
    speakerName: "Jane Doe",
    company: "Acme",
  }),
}));

jest.mock("@/lib/social/mailchimp", () => ({
  mailchimpProvider: {
    name: "mailchimp",
    createDraft: jest.fn(),
    searchContacts: jest.fn(),
    sendTest: jest.fn(),
    publish: jest.fn(),
  },
}));

jest.mock("@/lib/social-cache", () => ({
  getCachedSocialRecord: jest.fn(),
  saveCachedSocialRecord: jest.fn(),
}));

import { POST as createDraft } from "../draft/route";
import { POST as sendTest } from "../test/route";
import { POST as sendLive } from "../send/route";
import { GET as searchContacts } from "../search/route";
import { GET as getStatus } from "../status/route";

const PROVIDER = "mailchimp";

function routeParams(slug: string, provider = PROVIDER) {
  return { params: Promise.resolve({ slug, provider }) };
}

function postRequest(path: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function getRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method: "GET" });
}

beforeEach(() => {
  jest.mocked(getServerSession).mockResolvedValue({
    user: { email: "organizer@etsa.tech" },
  } as never);
  jest.mocked(isAuthorizedUser).mockReturnValue(true);
  jest.mocked(mockMailchimpProvider.createDraft).mockReset();
  jest.mocked(mockMailchimpProvider.searchContacts).mockReset();
  jest.mocked(mockMailchimpProvider.sendTest).mockReset();
  jest.mocked(mockMailchimpProvider.publish).mockReset();
  jest.mocked(mockGetCachedSocialRecord).mockReset();
  jest.mocked(mockSaveCachedSocialRecord).mockReset();
});

describe("draft route", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await createDraft(
      postRequest("/api/admin/posts/p/social/mailchimp/draft"),
      routeParams("p"),
    );
    expect(res.status).toBe(401);
  });

  it("404s on an unknown provider", async () => {
    const res = await createDraft(
      postRequest("/api/admin/posts/p/social/linkedin/draft"),
      routeParams("p", "linkedin"),
    );
    expect(res.status).toBe(404);
  });

  it("falls back to 'unknown' as createdBy when the session has no email", async () => {
    jest.mocked(getServerSession).mockResolvedValue({ user: {} } as never);
    jest
      .mocked(mockMailchimpProvider.createDraft)
      .mockResolvedValue({ campaignId: "c1", campaignUrl: "https://x" });

    await createDraft(
      postRequest("/api/admin/posts/p/social/mailchimp/draft"),
      routeParams("p"),
    );

    expect(mockMailchimpProvider.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: "unknown" }),
    );
  });

  it("returns 500 when the provider throws", async () => {
    jest
      .mocked(mockMailchimpProvider.createDraft)
      .mockRejectedValue(new Error("Mailchimp is down"));

    const res = await createDraft(
      postRequest("/api/admin/posts/err-post/social/mailchimp/draft"),
      routeParams("err-post"),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to create social draft");
  });
});

describe("test route", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await sendTest(
      postRequest("/api/admin/posts/p/social/mailchimp/test", {
        emails: ["a@example.com"],
      }),
      routeParams("p"),
    );
    expect(res.status).toBe(401);
  });

  it("404s on an unknown provider", async () => {
    const res = await sendTest(
      postRequest("/api/admin/posts/p/social/linkedin/test", {
        emails: ["a@example.com"],
      }),
      routeParams("p", "linkedin"),
    );
    expect(res.status).toBe(404);
  });

  it("rejects when no emails are provided", async () => {
    const res = await sendTest(
      postRequest("/api/admin/posts/err-post/social/mailchimp/test", {
        emails: [],
      }),
      routeParams("err-post"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least one test recipient/i);
  });

  it("rejects when emails is not an array", async () => {
    const res = await sendTest(
      postRequest("/api/admin/posts/err-post/social/mailchimp/test", {
        emails: "not-an-array@example.com",
      }),
      routeParams("err-post"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 when the provider throws", async () => {
    jest.mocked(mockGetCachedSocialRecord).mockResolvedValue({
      provider: "mailchimp",
      campaignId: "campaign-1",
      campaignUrl: null,
      status: "draft",
      testRecipients: [],
      sentAt: null,
      sentBy: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: null,
    });
    jest
      .mocked(mockMailchimpProvider.sendTest)
      .mockRejectedValue(new Error("Mailchimp is down"));

    const res = await sendTest(
      postRequest("/api/admin/posts/err-post/social/mailchimp/test", {
        emails: ["reviewer@example.com"],
      }),
      routeParams("err-post"),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to send test");
  });

  it("400s when no draft campaign exists yet", async () => {
    jest.mocked(mockGetCachedSocialRecord).mockResolvedValue(null);

    const res = await sendTest(
      postRequest("/api/admin/posts/no-draft-post/social/mailchimp/test", {
        emails: ["reviewer@example.com"],
      }),
      routeParams("no-draft-post"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no draft campaign/i);
    expect(mockMailchimpProvider.sendTest).not.toHaveBeenCalled();
  });

  it("saves a null updatedBy when the session has no email", async () => {
    jest.mocked(getServerSession).mockResolvedValue({ user: {} } as never);
    jest.mocked(mockGetCachedSocialRecord).mockResolvedValue({
      provider: "mailchimp",
      campaignId: "campaign-1",
      campaignUrl: null,
      status: "draft",
      testRecipients: [],
      sentAt: null,
      sentBy: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: null,
    });
    jest.mocked(mockMailchimpProvider.sendTest).mockResolvedValue(undefined);
    jest.mocked(mockSaveCachedSocialRecord).mockResolvedValue({
      provider: "mailchimp",
      campaignId: "campaign-1",
      campaignUrl: null,
      status: "tested",
      testRecipients: ["reviewer@example.com"],
      sentAt: null,
      sentBy: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: null,
    });

    const res = await sendTest(
      postRequest("/api/admin/posts/p/social/mailchimp/test", {
        emails: ["reviewer@example.com"],
      }),
      routeParams("p"),
    );
    expect(res.status).toBe(200);
    expect(mockSaveCachedSocialRecord).toHaveBeenCalledWith(
      "p",
      "mailchimp",
      expect.objectContaining({ status: "tested" }),
      null,
    );
  });
});

describe("send route", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await sendLive(
      postRequest("/api/admin/posts/p/social/mailchimp/send", {
        confirm: "Test Talk",
      }),
      routeParams("p"),
    );
    expect(res.status).toBe(401);
  });

  it("404s on an unknown provider", async () => {
    const res = await sendLive(
      postRequest("/api/admin/posts/p/social/linkedin/send", {
        confirm: "Test Talk",
      }),
      routeParams("p", "linkedin"),
    );
    expect(res.status).toBe(404);
  });

  it("records a null sentBy when the session has no email", async () => {
    jest.mocked(getServerSession).mockResolvedValue({ user: {} } as never);
    jest.mocked(mockGetCachedSocialRecord).mockResolvedValue({
      provider: "mailchimp",
      campaignId: "campaign-1",
      campaignUrl: null,
      status: "tested",
      testRecipients: ["reviewer@example.com"],
      sentAt: null,
      sentBy: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: null,
    });
    jest.mocked(mockMailchimpProvider.publish).mockResolvedValue(undefined);
    jest.mocked(mockSaveCachedSocialRecord).mockResolvedValue({
      provider: "mailchimp",
      campaignId: "campaign-1",
      campaignUrl: null,
      status: "sent",
      testRecipients: ["reviewer@example.com"],
      sentAt: "2026-01-01T00:00:00.000Z",
      sentBy: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: null,
    });

    const res = await sendLive(
      postRequest("/api/admin/posts/p/social/mailchimp/send", {
        confirm: "Test Talk",
      }),
      routeParams("p"),
    );
    expect(res.status).toBe(200);
    expect(mockSaveCachedSocialRecord).toHaveBeenCalledWith(
      "p",
      "mailchimp",
      expect.objectContaining({ sentBy: null }),
      null,
    );
  });

  it("returns 500 when the provider throws", async () => {
    jest.mocked(mockGetCachedSocialRecord).mockResolvedValue({
      provider: "mailchimp",
      campaignId: "campaign-1",
      campaignUrl: null,
      status: "tested",
      testRecipients: ["reviewer@example.com"],
      sentAt: null,
      sentBy: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: null,
    });
    jest
      .mocked(mockMailchimpProvider.publish)
      .mockRejectedValue(new Error("Mailchimp is down"));

    const res = await sendLive(
      postRequest("/api/admin/posts/err-post/social/mailchimp/send", {
        confirm: "Test Talk",
      }),
      routeParams("err-post"),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to send campaign");
  });
});

describe("search route", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await searchContacts(
      getRequest("/api/admin/posts/p/social/mailchimp/search?q=wes"),
      routeParams("p"),
    );
    expect(res.status).toBe(401);
  });

  it("404s on an unknown provider", async () => {
    const res = await searchContacts(
      getRequest("/api/admin/posts/p/social/linkedin/search?q=wes"),
      routeParams("p", "linkedin"),
    );
    expect(res.status).toBe(404);
  });

  it("returns an empty list without querying the provider when q is blank", async () => {
    const res = await searchContacts(
      getRequest("/api/admin/posts/p/social/mailchimp/search"),
      routeParams("p"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).contacts).toEqual([]);
    expect(mockMailchimpProvider.searchContacts).not.toHaveBeenCalled();
  });

  it("returns matching contacts for a query", async () => {
    jest
      .mocked(mockMailchimpProvider.searchContacts)
      .mockResolvedValue([
        { id: "1", email: "wesley@wesleyk.me", name: "Wesley" },
      ]);
    const res = await searchContacts(
      getRequest("/api/admin/posts/p/social/mailchimp/search?q=wesley"),
      routeParams("p"),
    );
    expect(res.status).toBe(200);
    const { contacts } = await res.json();
    expect(contacts).toEqual([
      { id: "1", email: "wesley@wesleyk.me", name: "Wesley" },
    ]);
  });

  it("returns 500 when the provider throws", async () => {
    jest
      .mocked(mockMailchimpProvider.searchContacts)
      .mockRejectedValue(new Error("Mailchimp is down"));
    const res = await searchContacts(
      getRequest("/api/admin/posts/p/social/mailchimp/search?q=wesley"),
      routeParams("p"),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to search contacts");
  });
});

describe("status route", () => {
  it("rejects unauthorized users", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const res = await getStatus(
      getRequest("/api/admin/posts/p/social/mailchimp/status"),
      routeParams("p"),
    );
    expect(res.status).toBe(401);
  });

  it("404s on an unknown provider", async () => {
    const res = await getStatus(
      getRequest("/api/admin/posts/p/social/linkedin/status"),
      routeParams("p", "linkedin"),
    );
    expect(res.status).toBe(404);
  });

  it("returns null when nothing is cached yet", async () => {
    jest.mocked(mockGetCachedSocialRecord).mockResolvedValue(null);
    const res = await getStatus(
      getRequest("/api/admin/posts/p/social/mailchimp/status"),
      routeParams("p"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).cached).toBeNull();
  });

  it("returns 500 when the cache lookup throws", async () => {
    jest
      .mocked(mockGetCachedSocialRecord)
      .mockRejectedValue(new Error("Blobs is down"));
    const res = await getStatus(
      getRequest("/api/admin/posts/p/social/mailchimp/status"),
      routeParams("p"),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to load social send status");
  });
});
