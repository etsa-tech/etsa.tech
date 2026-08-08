import { mailchimpProvider } from "../mailchimp";

const ENV_KEYS = [
  "MAILCHIMP_API_KEY",
  "MAILCHIMP_SERVER_PREFIX",
  "MAILCHIMP_LIST_ID",
  "MAILCHIMP_TEMPLATE_ID_PRESENTATION",
] as const;

function setValidEnv() {
  process.env.MAILCHIMP_API_KEY = "test-key-us7";
  process.env.MAILCHIMP_SERVER_PREFIX = "us7";
  process.env.MAILCHIMP_LIST_ID = "list123";
  process.env.MAILCHIMP_TEMPLATE_ID_PRESENTATION = "42";
}

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const DRAFT_INPUT = {
  slug: "2026-08-04-home-lab-journey",
  title: "A Home Lab Journey",
  bio: "Speaker bio",
  date: "2026-08-04",
  abstract: "Talk abstract",
  speakerName: "Jane Doe",
  company: "Acme",
  createdBy: "organizer@etsa.tech",
};

describe("mailchimpProvider", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    setValidEnv();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    clearEnv();
    jest.restoreAllMocks();
  });

  describe("config validation", () => {
    it.each(ENV_KEYS)("throws when %s is missing", async (missingKey) => {
      delete process.env[missingKey];
      await expect(mailchimpProvider.createDraft(DRAFT_INPUT)).rejects.toThrow(
        "Mailchimp configuration missing",
      );
    });
  });

  describe("createDraft", () => {
    it("creates a campaign, pushes template sections, and returns campaignId/campaignUrl", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            campaign_defaults: {
              from_name: "ETSA",
              from_email: "info@etsa.tech",
              subject: "",
              language: "en",
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ id: "campaign-abc", web_id: 18239828 }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 }));

      const result = await mailchimpProvider.createDraft(DRAFT_INPUT);

      expect(result).toEqual({
        campaignId: "campaign-abc",
        campaignUrl:
          "https://us7.admin.mailchimp.com/campaigns/edit?id=18239828",
      });

      // Second call creates the campaign - check recipients/template wiring.
      const createCall = fetchMock.mock.calls[1];
      expect(createCall[0]).toBe("https://us7.api.mailchimp.com/3.0/campaigns");
      const createBody = JSON.parse(createCall[1].body);
      expect(createBody.recipients.list_id).toBe("list123");
      expect(createBody.settings.template_id).toBe(42);
      expect(createBody.settings.title).toContain(DRAFT_INPUT.slug);
      expect(createBody.settings.title).toContain(DRAFT_INPUT.createdBy);

      // Third call pushes content - both title spots must carry the same value.
      const contentCall = fetchMock.mock.calls[2];
      expect(contentCall[0]).toBe(
        "https://us7.api.mailchimp.com/3.0/campaigns/campaign-abc/content",
      );
      const contentBody = JSON.parse(contentCall[1].body);
      expect(contentBody.template.sections).toEqual({
        bio: DRAFT_INPUT.bio,
        date: DRAFT_INPUT.date,
        abstract: DRAFT_INPUT.abstract,
        title: DRAFT_INPUT.title,
        titleHeading: DRAFT_INPUT.title,
        speakerName: DRAFT_INPUT.speakerName,
        company: DRAFT_INPUT.company,
      });
    });

    it("falls back to the input title when the list has no default subject", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            campaign_defaults: {
              from_name: "ETSA",
              from_email: "info@etsa.tech",
              subject: "",
              language: "en",
            },
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ id: "c1", web_id: 1 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }));

      await mailchimpProvider.createDraft(DRAFT_INPUT);

      const createBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(createBody.settings.subject_line).toBe(DRAFT_INPUT.title);
    });
  });

  describe("searchContacts", () => {
    it("merges exact and partial matches, deduping by member id", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          exact_matches: {
            members: [
              {
                id: "1",
                email_address: "wesley@wesleyk.me",
                merge_fields: { FNAME: "Wesley", LNAME: "Kirkland" },
              },
            ],
          },
          full_search: {
            members: [
              // Same id as the exact match - must not be duplicated.
              { id: "1", email_address: "wesley@wesleyk.me" },
              { id: "2", email_address: "wes.other@example.com" },
            ],
          },
        }),
      );

      const contacts = await mailchimpProvider.searchContacts("wes");

      expect(contacts).toEqual([
        { id: "1", email: "wesley@wesleyk.me", name: "Wesley Kirkland" },
        { id: "2", email: "wes.other@example.com", name: undefined },
      ]);

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("/search-members?query=wes&list_id=list123");
    });
  });

  describe("sendTest", () => {
    it("posts the given emails as a test send", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await mailchimpProvider.sendTest("campaign-1", ["a@example.com"]);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        "https://us7.api.mailchimp.com/3.0/campaigns/campaign-1/actions/test",
      );
      expect(JSON.parse(init.body)).toEqual({
        test_emails: ["a@example.com"],
        send_type: "html",
      });
    });
  });

  describe("publish", () => {
    it("posts to the send action", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await mailchimpProvider.publish("campaign-1");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe(
        "https://us7.api.mailchimp.com/3.0/campaigns/campaign-1/actions/send",
      );
    });
  });

  describe("error handling", () => {
    it("throws the API's detail message on a non-ok response", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ detail: "Invalid campaign id" }, 404),
      );

      await expect(mailchimpProvider.publish("bad-id")).rejects.toThrow(
        "Invalid campaign id",
      );
    });

    it("falls back to a generic message when the error body has no detail", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

      await expect(mailchimpProvider.publish("bad-id")).rejects.toThrow(
        "Mailchimp API error: 500",
      );
    });

    it("reports a timeout as a clear error rather than a raw AbortError", async () => {
      fetchMock.mockImplementationOnce(() => {
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";
        return Promise.reject(abortError);
      });

      await expect(mailchimpProvider.publish("campaign-1")).rejects.toThrow(
        "Mailchimp API request timed out",
      );
    });

    it("actually aborts the in-flight request once the timeout elapses", async () => {
      jest.useFakeTimers();
      try {
        fetchMock.mockImplementationOnce(
          (_url: string, init: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener("abort", () => {
                const abortError = new Error("The operation was aborted");
                abortError.name = "AbortError";
                reject(abortError);
              });
            }),
        );

        const result = mailchimpProvider.publish("campaign-1");
        // Attach the rejection handler before advancing timers, so the
        // abort-triggered rejection is never briefly unhandled.
        const assertion = expect(result).rejects.toThrow(
          "Mailchimp API request timed out",
        );
        await jest.advanceTimersByTimeAsync(10_000);
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
