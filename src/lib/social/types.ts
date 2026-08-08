export interface SocialDraftInput {
  slug: string;
  title: string;
  bio: string;
  date: string;
  abstract: string;
  speakerName: string;
  company: string;
  createdBy: string;
}

export interface SocialContact {
  id: string;
  email: string;
  name?: string;
}

export interface SocialProvider {
  readonly name: string;
  createDraft(
    input: SocialDraftInput,
  ): Promise<{ campaignId: string; campaignUrl: string }>;
  searchContacts(query: string): Promise<SocialContact[]>;
  sendTest(campaignId: string, emails: string[]): Promise<void>;
  publish(campaignId: string): Promise<void>;
}
