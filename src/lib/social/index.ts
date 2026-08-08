import "server-only";
import { mailchimpProvider } from "./mailchimp";
import type { SocialProvider } from "./types";

const providers: Record<string, SocialProvider> = {
  mailchimp: mailchimpProvider,
};

export function getProvider(name: string): SocialProvider | null {
  return providers[name] ?? null;
}

export type { SocialProvider, SocialDraftInput, SocialContact } from "./types";
