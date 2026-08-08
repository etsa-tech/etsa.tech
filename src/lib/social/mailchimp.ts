import "server-only";
import type { SocialContact, SocialDraftInput, SocialProvider } from "./types";

const REQUEST_TIMEOUT_MS = 10000;

function getConfig() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const templateId = process.env.MAILCHIMP_TEMPLATE_ID_PRESENTATION;

  if (!apiKey || !serverPrefix || !listId || !templateId) {
    throw new Error("Mailchimp configuration missing");
  }

  return { apiKey, serverPrefix, listId, templateId };
}

function authHeader(apiKey: string): string {
  const authString = `anystring:${apiKey}`;
  return `Basic ${Buffer.from(authString).toString("base64")}`;
}

async function mailchimpFetch(
  serverPrefix: string,
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://${serverPrefix}.api.mailchimp.com/3.0${path}`,
      {
        ...init,
        headers: {
          Authorization: authHeader(apiKey),
          "Content-Type": "application/json",
          ...init.headers,
        },
        signal: controller.signal,
      },
    );

    if (response.status === 204) {
      return null;
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        (body as { detail?: string } | null)?.detail ??
        `Mailchimp API error: ${response.status}`;
      throw new Error(detail);
    }

    return body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Mailchimp API request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface CampaignDefaults {
  from_name: string;
  from_email: string;
  subject: string;
  language: string;
}

async function getListCampaignDefaults(
  serverPrefix: string,
  apiKey: string,
  listId: string,
): Promise<CampaignDefaults> {
  const list = (await mailchimpFetch(
    serverPrefix,
    apiKey,
    `/lists/${listId}`,
  )) as {
    campaign_defaults: CampaignDefaults;
  };
  return list.campaign_defaults;
}

async function createDraft(
  input: SocialDraftInput,
): Promise<{ campaignId: string; campaignUrl: string }> {
  const { apiKey, serverPrefix, listId, templateId } = getConfig();
  const defaults = await getListCampaignDefaults(serverPrefix, apiKey, listId);

  const campaign = (await mailchimpFetch(serverPrefix, apiKey, "/campaigns", {
    method: "POST",
    body: JSON.stringify({
      type: "regular",
      recipients: { list_id: listId },
      settings: {
        subject_line: defaults.subject || input.title,
        title: `[Admin Console] ${input.slug} - created by ${
          input.createdBy
        } - ${new Date().toISOString()}`,
        from_name: defaults.from_name,
        reply_to: defaults.from_email,
        template_id: Number(templateId),
      },
    }),
  })) as { id: string; web_id: number };

  await mailchimpFetch(
    serverPrefix,
    apiKey,
    `/campaigns/${campaign.id}/content`,
    {
      method: "PUT",
      body: JSON.stringify({
        template: {
          id: Number(templateId),
          sections: {
            bio: input.bio,
            date: input.date,
            abstract: input.abstract,
            // The template's talk title appears twice (Topic: line, and a
            // large heading before the abstract) - Mailchimp requires
            // mc:edit IDs to be unique per template, so the two spots are
            // two distinct section names carrying the same value.
            title: input.title,
            titleHeading: input.title,
            speakerName: input.speakerName,
            company: input.company,
          },
        },
      }),
    },
  );

  return {
    campaignId: campaign.id,
    // Admin-UI edit link uses web_id (a numeric ID), not the API's own
    // hash-style campaign id.
    campaignUrl: `https://${serverPrefix}.admin.mailchimp.com/campaigns/edit?id=${campaign.web_id}`,
  };
}

interface MailchimpMemberResult {
  id: string;
  email_address: string;
  merge_fields?: { FNAME?: string; LNAME?: string };
}

async function searchContacts(query: string): Promise<SocialContact[]> {
  const { apiKey, serverPrefix, listId } = getConfig();
  const result = (await mailchimpFetch(
    serverPrefix,
    apiKey,
    `/search-members?query=${encodeURIComponent(query)}&list_id=${listId}`,
  )) as {
    exact_matches: { members: MailchimpMemberResult[] };
    // full_search carries partial/fuzzy matches (e.g. "wesley" matching
    // wesley@wesleyk.me) - exact_matches alone only matches whole
    // email/name tokens.
    full_search: { members: MailchimpMemberResult[] };
  };

  const seen = new Set<string>();
  const members = [
    ...result.exact_matches.members,
    ...result.full_search.members,
  ].filter((member) => {
    if (seen.has(member.id)) return false;
    seen.add(member.id);
    return true;
  });

  return members.map((member) => ({
    id: member.id,
    email: member.email_address,
    name:
      [member.merge_fields?.FNAME, member.merge_fields?.LNAME]
        .filter(Boolean)
        .join(" ") || undefined,
  }));
}

async function sendTest(campaignId: string, emails: string[]): Promise<void> {
  const { apiKey, serverPrefix } = getConfig();
  await mailchimpFetch(
    serverPrefix,
    apiKey,
    `/campaigns/${campaignId}/actions/test`,
    {
      method: "POST",
      body: JSON.stringify({
        test_emails: emails,
        send_type: "html",
      }),
    },
  );
}

async function publish(campaignId: string): Promise<void> {
  const { apiKey, serverPrefix } = getConfig();
  await mailchimpFetch(
    serverPrefix,
    apiKey,
    `/campaigns/${campaignId}/actions/send`,
    { method: "POST" },
  );
}

export const mailchimpProvider: SocialProvider = {
  name: "mailchimp",
  createDraft,
  searchContacts,
  sendTest,
  publish,
};
