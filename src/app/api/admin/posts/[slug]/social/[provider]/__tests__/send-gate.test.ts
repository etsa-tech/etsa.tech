/**
 * Integration test for the social-mailing send gate: a live send must be
 * refused unless a test send has already gone out against the *current*
 * draft, and creating a new draft must invalidate any prior test history.
 *
 * Only true external boundaries are mocked: auth, the Mailchimp network
 * calls, and Netlify Blobs storage (replaced with an in-memory Map). The
 * route handlers and src/lib/social-cache.ts run for real.
 */
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { mailchimpProvider as mockMailchimpProvider } from "@/lib/social/mailchimp";

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

// Defined entirely inside the factory - referencing an outer-scope const
// here would hit the TDZ, since ES module imports (including this mocked
// one, pulled in below) evaluate before any of this file's own top-level
// statements run.
jest.mock("@/lib/social/mailchimp", () => ({
  mailchimpProvider: {
    name: "mailchimp",
    createDraft: jest.fn(),
    searchContacts: jest.fn(),
    sendTest: jest.fn(),
    publish: jest.fn(),
  },
}));

jest.mock("@netlify/blobs", () => {
  const stores = new Map<string, Map<string, unknown>>();
  return {
    getStore: (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name)!;
      return {
        get: async (key: string) => data.get(key) ?? null,
        setJSON: async (key: string, value: unknown) => {
          data.set(key, value);
        },
      };
    },
  };
});

import { POST as createDraft } from "../draft/route";
import { POST as sendTest } from "../test/route";
import { POST as sendLive } from "../send/route";

const PROVIDER = "mailchimp";

function routeParams(slug: string) {
  return { params: Promise.resolve({ slug, provider: PROVIDER }) };
}

function jsonRequest(path: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  jest.mocked(getServerSession).mockResolvedValue({
    user: { email: "organizer@etsa.tech" },
  } as never);
  jest.mocked(isAuthorizedUser).mockReturnValue(true);
  jest
    .mocked(mockMailchimpProvider.createDraft)
    .mockReset()
    .mockImplementation(async () => {
      const campaignId = `campaign-${Math.random()}`;
      return {
        campaignId,
        campaignUrl: `https://usX.admin.mailchimp.com/campaigns/edit?id=${campaignId}`,
      };
    });
  jest
    .mocked(mockMailchimpProvider.sendTest)
    .mockReset()
    .mockResolvedValue(undefined);
  jest
    .mocked(mockMailchimpProvider.publish)
    .mockReset()
    .mockResolvedValue(undefined);
});

describe("social send gate", () => {
  it("refuses a live send with no draft, then with a draft but no test, then allows it once tested", async () => {
    const slug = "gate-flow-post";

    // No draft yet.
    let res = await sendLive(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/send`, {
        confirm: "Test Talk",
      }),
      routeParams(slug),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no draft campaign/i);
    expect(mockMailchimpProvider.publish).not.toHaveBeenCalled();

    // Create a draft.
    res = await createDraft(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/draft`),
      routeParams(slug),
    );
    expect(res.status).toBe(200);
    const { cached: drafted } = await res.json();
    expect(drafted.status).toBe("draft");
    expect(drafted.campaignId).toBeTruthy();

    // Draft exists, but no test send yet - still refused.
    res = await sendLive(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/send`, {
        confirm: "Test Talk",
      }),
      routeParams(slug),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/test send is required/i);
    expect(mockMailchimpProvider.publish).not.toHaveBeenCalled();

    // Send a test.
    res = await sendTest(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/test`, {
        emails: ["reviewer@example.com"],
      }),
      routeParams(slug),
    );
    expect(res.status).toBe(200);
    const { cached: tested } = await res.json();
    expect(tested.status).toBe("tested");
    expect(tested.testRecipients).toEqual(["reviewer@example.com"]);

    // Now the live send succeeds.
    res = await sendLive(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/send`, {
        confirm: "Test Talk",
      }),
      routeParams(slug),
    );
    expect(res.status).toBe(200);
    const { cached: sent } = await res.json();
    expect(sent.status).toBe("sent");
    expect(sent.sentBy).toBe("organizer@etsa.tech");
    expect(mockMailchimpProvider.publish).toHaveBeenCalledWith(
      drafted.campaignId,
    );
  });

  it("resets the test gate when a new draft is created", async () => {
    const slug = "gate-redraft-post";

    await createDraft(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/draft`),
      routeParams(slug),
    );
    await sendTest(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/test`, {
        emails: ["reviewer@example.com"],
      }),
      routeParams(slug),
    );

    let res = await sendLive(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/send`, {
        confirm: "Test Talk",
      }),
      routeParams(slug),
    );
    expect(res.status).toBe(200);

    // Recreating the draft (e.g. content changed) must clear prior test
    // history - a stale test against old content can't authorize a send
    // against new content.
    res = await createDraft(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/draft`),
      routeParams(slug),
    );
    const { cached: redrafted } = await res.json();
    expect(redrafted.status).toBe("draft");
    expect(redrafted.testRecipients).toEqual([]);

    res = await sendLive(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/send`, {
        confirm: "Test Talk",
      }),
      routeParams(slug),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/test send is required/i);
  });

  it("rejects a live send when the confirmation text doesn't match the post title", async () => {
    const slug = "gate-confirm-mismatch-post";

    const res = await sendLive(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/send`, {
        confirm: "the wrong title",
      }),
      routeParams(slug),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not match/i);
    expect(mockMailchimpProvider.publish).not.toHaveBeenCalled();
  });

  it("rejects unauthorized users before touching the gate", async () => {
    jest.mocked(isAuthorizedUser).mockReturnValue(false);
    const slug = "gate-unauthorized-post";

    const res = await sendLive(
      jsonRequest(`/api/admin/posts/${slug}/social/mailchimp/send`, {
        confirm: "Test Talk",
      }),
      routeParams(slug),
    );
    expect(res.status).toBe(401);
    expect(mockMailchimpProvider.publish).not.toHaveBeenCalled();
  });

  it("404s on an unknown provider", async () => {
    const slug = "gate-unknown-provider-post";
    const res = await sendLive(
      jsonRequest(`/api/admin/posts/${slug}/social/linkedin/send`, {
        confirm: "Test Talk",
      }),
      { params: Promise.resolve({ slug, provider: "linkedin" }) },
    );
    expect(res.status).toBe(404);
  });
});
