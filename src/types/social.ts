export type SocialSendStatus = "draft" | "tested" | "sent";

export interface SocialCacheRecord {
  provider: string;
  campaignId: string | null;
  campaignUrl: string | null;
  status: SocialSendStatus;
  // Every address a test send has gone to, across every test send - this is
  // the audit trail that gates the live "send" action (a prod send is
  // refused unless at least one test send has already happened).
  testRecipients: string[];
  sentAt: string | null;
  sentBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}
