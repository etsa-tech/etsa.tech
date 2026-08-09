import "server-only";

const REQUEST_TIMEOUT_MS = 10000;
const LINKEDIN_VERSION = "202401";
const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const ORG_ACLS_URL = "https://api.linkedin.com/rest/organizationAcls";
const POSTS_URL = "https://api.linkedin.com/rest/posts";

// Community Management API app - approved for org-page posting
// (w_organization_social) and org-admin verification. Kept separate from
// the speaker-connect app below because LinkedIn's manual review for
// Community Management API access is tied to one specific app/product
// combination, and mixing it with the Sign In with LinkedIn product on the
// same app has caused LinkedIn to reject the org-posting scope entirely.
export function getLinkedInOrgConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const organizationId = process.env.LINKEDIN_ORGANIZATION_ID;

  if (!clientId || !clientSecret || !organizationId) {
    throw new Error("LinkedIn organization app configuration missing");
  }

  return { clientId, clientSecret, organizationId };
}

// Sign In with LinkedIn (OpenID Connect) app - used only for the one-time
// speaker connect that captures a mentionable member URN. Separate app from
// getLinkedInOrgConfig above - see that comment for why.
export function getLinkedInSpeakerConfig() {
  const clientId = process.env.LINKEDIN_SPEAKER_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_SPEAKER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn speaker app configuration missing");
  }

  return { clientId, clientSecret };
}

// The redirect_uri LinkedIn sends the browser back to must exactly match
// what's registered on the app - reusing NEXTAUTH_URL keeps that in sync
// with the one canonical origin this app already treats as authoritative.
export function getSiteOrigin(): string {
  const url = process.env.NEXTAUTH_URL;
  if (!url) {
    throw new Error("NEXTAUTH_URL is not configured");
  }
  return url.replace(/\/$/, "");
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", params.scope);
  return url.toString();
}

async function linkedInFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("LinkedIn API request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function exchangeCodeForToken(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ accessToken: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });

  const response = await linkedInFetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await response.json().catch(() => null)) as {
    access_token?: string;
    error_description?: string;
  } | null;

  if (!response.ok || !data?.access_token) {
    throw new Error(
      data?.error_description ||
        `LinkedIn token exchange failed: ${response.status}`,
    );
  }

  return { accessToken: data.access_token };
}

// OIDC userinfo endpoint - `sub` is the same member id LinkedIn's mention
// URN format (urn:li:person:{sub}) is built from. This is the only
// compliant way to learn a member's mentionable id: LinkedIn has no
// lookup-by-profile-URL API.
export async function getMemberSub(accessToken: string): Promise<string> {
  const response = await linkedInFetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await response.json().catch(() => null)) as {
    sub?: string;
  } | null;

  if (!response.ok || !data?.sub) {
    throw new Error(`Failed to load LinkedIn profile: ${response.status}`);
  }

  return data.sub;
}

export async function verifyOrganizationAdmin(
  accessToken: string,
  organizationId: string,
): Promise<boolean> {
  const url = new URL(ORG_ACLS_URL);
  url.searchParams.set("q", "roleAssignee");
  url.searchParams.set("role", "ADMINISTRATOR");
  url.searchParams.set("state", "APPROVED");

  const response = await linkedInFetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  const data = (await response.json().catch(() => null)) as {
    elements?: Array<{ organization?: string }>;
  } | null;

  if (!response.ok || !data?.elements) {
    throw new Error(
      `Failed to verify LinkedIn organization access: ${response.status}`,
    );
  }

  const targetOrganization = `urn:li:organization:${organizationId}`;
  return data.elements.some(
    (element) => element.organization === targetOrganization,
  );
}

export async function createOrganizationPost(params: {
  accessToken: string;
  organizationId: string;
  commentary: string;
}): Promise<{ postUrn: string; postUrl: string }> {
  const response = await linkedInFetch(POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:organization:${params.organizationId}`,
      commentary: params.commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      detail?.message || `LinkedIn post failed: ${response.status}`,
    );
  }

  // LinkedIn's Posts API returns the new post's id in a response header,
  // not the (empty) body.
  const postUrn =
    response.headers.get("x-restli-id") ??
    response.headers.get("x-linkedin-id");
  if (!postUrn) {
    throw new Error("LinkedIn did not return a post id");
  }

  return {
    postUrn,
    postUrl: `https://www.linkedin.com/feed/update/${postUrn}/`,
  };
}
