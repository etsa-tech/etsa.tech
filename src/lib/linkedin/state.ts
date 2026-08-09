import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Just long enough to cover the LinkedIn consent-screen redirect round trip -
// this is a CSRF token, not a session, so it should expire fast.
const STATE_TTL_MS = 10 * 60 * 1000;

export interface LinkedInPostState {
  purpose: "post";
  slug: string;
}

export interface LinkedInSpeakerState {
  purpose: "speaker-connect";
  slug: string;
  speakerName: string;
}

export type LinkedInOAuthState = LinkedInPostState | LinkedInSpeakerState;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

// Encodes state as base64url(payload).base64url(hmac) so it round-trips
// safely through a URL query parameter.
export function signState(state: LinkedInOAuthState): string {
  const payload = JSON.stringify({ ...state, exp: Date.now() + STATE_TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyState(token: string): LinkedInOAuthState | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = Buffer.from(sign(encoded));
  const actualSignature = Buffer.from(signature);
  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as LinkedInOAuthState & { exp: number };

    if (Date.now() > payload.exp) {
      return null;
    }

    if (payload.purpose === "speaker-connect") {
      return {
        purpose: "speaker-connect",
        slug: payload.slug,
        speakerName: payload.speakerName,
      };
    }

    return { purpose: "post", slug: payload.slug };
  } catch {
    return null;
  }
}
