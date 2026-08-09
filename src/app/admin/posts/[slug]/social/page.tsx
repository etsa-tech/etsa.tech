"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { SocialCacheRecord } from "@/types/social";

const PROVIDER = "mailchimp";

interface PostSummary {
  title: string;
  bio: string;
  date: string;
  abstract: string;
  speakerName: string;
  company: string;
  isBlogpost: boolean;
  speakerLinkedInUrn: string | null;
}

interface SocialContact {
  id: string;
  email: string;
  name?: string;
}

function StatusBadge({
  status,
}: Readonly<{ status: SocialCacheRecord["status"] }>) {
  const styles: Record<SocialCacheRecord["status"], string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    tested: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    sent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function SocialMailingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<PostSummary | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [record, setRecord] = useState<SocialCacheRecord | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<SocialContact[]>(
    [],
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const [confirmText, setConfirmText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [linkedInRecord, setLinkedInRecord] =
    useState<SocialCacheRecord | null>(null);
  const [isLinkedInSpeakerConnected, setIsLinkedInSpeakerConnected] =
    useState(false);
  const [linkedInSpeakerUrn, setLinkedInSpeakerUrn] = useState<string | null>(
    null,
  );
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(true);
  const [linkedInBanner, setLinkedInBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [copyLinkStatus, setCopyLinkStatus] = useState<
    "idle" | "copied" | "failed"
  >("idle");
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [unlinkPrUrl, setUnlinkPrUrl] = useState<string | null>(null);
  const [unlinkPrNumber, setUnlinkPrNumber] = useState<number | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promotePrUrl, setPromotePrUrl] = useState<string | null>(null);
  const [promotePrNumber, setPromotePrNumber] = useState<number | null>(null);
  const [promoteAutoMerge, setPromoteAutoMerge] = useState(false);
  const [linkedInDraftText, setLinkedInDraftText] = useState("");
  const [isLinkedInDraftLoading, setIsLinkedInDraftLoading] = useState(true);
  const [isSavingLinkedInDraft, setIsSavingLinkedInDraft] = useState(false);
  const [isResettingLinkedInDraft, setIsResettingLinkedInDraft] =
    useState(false);
  const [linkedInDraftSaved, setLinkedInDraftSaved] = useState(false);
  const [linkedInDraftError, setLinkedInDraftError] = useState<string | null>(
    null,
  );
  const [isStartingLinkedInPost, setIsStartingLinkedInPost] = useState(false);

  const refreshStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/social/${PROVIDER}/status`,
      );
      if (response.ok) {
        const { cached } = await response.json();
        setRecord(cached);
      }
    } finally {
      setIsLoadingStatus(false);
    }
  }, [slug]);

  const refreshLinkedInStatus = useCallback(
    async (speakerName: string) => {
      setIsLoadingLinkedIn(true);
      try {
        const query = speakerName
          ? `?speaker=${encodeURIComponent(speakerName)}`
          : "";
        const response = await fetch(
          `/api/admin/posts/${slug}/social/linkedin/status${query}`,
        );
        if (response.ok) {
          const data = await response.json();
          setLinkedInRecord(data.cached);
          setIsLinkedInSpeakerConnected(Boolean(data.speakerConnected));
          setLinkedInSpeakerUrn(data.speakerUrn ?? null);
        }
      } finally {
        setIsLoadingLinkedIn(false);
      }
    },
    [slug],
  );

  const refreshLinkedInDraft = useCallback(
    async (fresh = false) => {
      setIsLinkedInDraftLoading(true);
      try {
        const query = fresh ? "?fresh=1" : "";
        const response = await fetch(
          `/api/admin/posts/${slug}/social/linkedin/draft${query}`,
        );
        if (response.ok) {
          const data = await response.json();
          setLinkedInDraftText(data.commentary ?? "");
        }
      } finally {
        setIsLinkedInDraftLoading(false);
      }
    },
    [slug],
  );

  // The LinkedIn post-authorize/callback routes are full-page redirects (an
  // OAuth consent screen can't happen inside a fetch()), so their result
  // comes back as query params on this page rather than a fetch response.
  // The speaker-connect flow does NOT land back here - speakers aren't
  // admins and can't load this page, so that callback redirects to the
  // public /linkedin-connected page instead.
  useEffect(() => {
    const url = new URL(window.location.href);
    const success = url.searchParams.get("linkedin_success");
    const error = url.searchParams.get("linkedin_error");

    if (success) {
      setLinkedInBanner({ type: "success", message: "Posted to LinkedIn." });
    } else if (error) {
      setLinkedInBanner({
        type: "error",
        message: `LinkedIn post failed: ${error}`,
      });
    }

    if (success || error) {
      ["linkedin_success", "linkedin_error"].forEach((key) =>
        url.searchParams.delete(key),
      );
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (!slug) return;

    (async () => {
      setIsLoadingPost(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/admin/posts/${slug}`);
        if (!response.ok) throw new Error("Failed to load post");
        const { frontmatter } = await response.json();
        const speaker = frontmatter.speakers?.[0];
        const speakerName = speaker?.name ?? frontmatter.speakerName ?? "";
        setPost({
          title: frontmatter.title,
          bio: speaker?.bio ?? frontmatter.speakerBio ?? "",
          date:
            frontmatter.eventDate ??
            frontmatter.meetingDate ??
            frontmatter.date,
          abstract: frontmatter.presentationDescription ?? frontmatter.excerpt,
          speakerName,
          company: speaker?.company ?? frontmatter.speakerCompany ?? "",
          isBlogpost: frontmatter.blogpost === true,
          speakerLinkedInUrn:
            speaker?.linkedInUrn ?? frontmatter.speakerLinkedInUrn ?? null,
        });
        refreshLinkedInStatus(speakerName);
      } catch {
        setLoadError("Failed to load post.");
      } finally {
        setIsLoadingPost(false);
      }
    })();

    refreshStatus();
    refreshLinkedInDraft();
  }, [slug, refreshStatus, refreshLinkedInStatus, refreshLinkedInDraft]);

  const createDraft = async () => {
    setIsDrafting(true);
    setDraftError(null);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/social/${PROVIDER}/draft`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create draft");
      setRecord(data.cached);
      setSelectedRecipients([]);
    } catch (err) {
      setDraftError(
        err instanceof Error ? err.message : "Failed to create draft",
      );
    } finally {
      setIsDrafting(false);
    }
  };

  const runSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/social/${PROVIDER}/search?q=${encodeURIComponent(
          query,
        )}`,
      );
      if (response.ok) {
        const { contacts } = await response.json();
        setSearchResults(contacts);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const addRecipient = (contact: SocialContact) => {
    setSelectedRecipients((prev) =>
      prev.some((r) => r.id === contact.id) ? prev : [...prev, contact],
    );
    setSearchResults([]);
    setSearchQuery("");
  };

  const removeRecipient = (id: string) => {
    setSelectedRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const sendTest = async () => {
    if (selectedRecipients.length === 0) return;
    setIsSendingTest(true);
    setTestError(null);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/social/${PROVIDER}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emails: selectedRecipients.map((r) => r.email),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send test");
      setRecord(data.cached);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed to send test");
    } finally {
      setIsSendingTest(false);
    }
  };

  const sendLive = async () => {
    setIsSending(true);
    setSendError(null);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/social/${PROVIDER}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: confirmText }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send");
      setRecord(data.cached);
      setConfirmText("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  const unlinkSpeakerLinkedIn = async () => {
    if (!post?.speakerName) return;
    setIsUnlinking(true);
    setUnlinkError(null);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/social/linkedin/speaker/unlink`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ speaker: post.speakerName }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to unlink");
      setIsLinkedInSpeakerConnected(false);
      setLinkedInSpeakerUrn(null);
      setCopyLinkStatus("idle");
      setPromotePrUrl(null);
      setPromotePrNumber(null);
      if (data.frontmatterCleared) {
        setUnlinkPrUrl(data.prUrl);
        setUnlinkPrNumber(data.prNumber);
        setPost((prev) =>
          prev ? { ...prev, speakerLinkedInUrn: null } : prev,
        );
      }
    } catch (err) {
      setUnlinkError(err instanceof Error ? err.message : "Failed to unlink");
    } finally {
      setIsUnlinking(false);
    }
  };

  // Copies the connected urn from the Blobs store into this post's
  // frontmatter via a PR - purely for durability/visibility in git. Safe to
  // call more than once: the branch/PR it opens gets reused, not duplicated.
  const promoteSpeakerLinkedIn = async () => {
    if (!post?.speakerName) return;
    setIsPromoting(true);
    setPromoteError(null);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/social/linkedin/speaker/promote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ speaker: post.speakerName }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to promote");
      if (data.alreadyPromoted) {
        // Frontmatter already matched (e.g. a duplicate click) - nothing to
        // show a PR link for, just reflect that it's up to date.
        setPost((prev) =>
          prev ? { ...prev, speakerLinkedInUrn: linkedInSpeakerUrn } : prev,
        );
      } else {
        setPromotePrUrl(data.prUrl);
        setPromotePrNumber(data.prNumber);
        setPromoteAutoMerge(Boolean(data.autoMergeEnabled));
      }
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : "Failed to promote");
    } finally {
      setIsPromoting(false);
    }
  };

  // The speaker isn't an ETSA admin and can't load this page themselves -
  // this link needs to be copied out and sent to them directly (email,
  // Slack, etc.), not clicked from here.
  const copySpeakerInviteLink = async () => {
    if (!post?.speakerName) return;
    const url = `${
      window.location.origin
    }/api/admin/posts/${slug}/social/linkedin/speaker/authorize?speaker=${encodeURIComponent(
      post.speakerName,
    )}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyLinkStatus("copied");
    } catch {
      setCopyLinkStatus("failed");
    }
  };

  const saveLinkedInDraft = async () => {
    setIsSavingLinkedInDraft(true);
    setLinkedInDraftError(null);
    setLinkedInDraftSaved(false);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/social/linkedin/draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentary: linkedInDraftText }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save draft");
      setLinkedInDraftSaved(true);
    } catch (err) {
      setLinkedInDraftError(
        err instanceof Error ? err.message : "Failed to save draft",
      );
    } finally {
      setIsSavingLinkedInDraft(false);
    }
  };

  const resetLinkedInDraftToTemplate = async () => {
    setIsResettingLinkedInDraft(true);
    setLinkedInDraftError(null);
    setLinkedInDraftSaved(false);
    try {
      await refreshLinkedInDraft(true);
    } finally {
      setIsResettingLinkedInDraft(false);
    }
  };

  // A plain <a href> can't run code first - saving here means the button's
  // most recent edits always go out, even if the admin forgot to click
  // "Save draft" before posting.
  const startLinkedInPost = async () => {
    setIsStartingLinkedInPost(true);
    setLinkedInDraftError(null);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/social/linkedin/draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentary: linkedInDraftText }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save draft");
      window.location.href = `/api/admin/posts/${slug}/social/linkedin/authorize`;
    } catch (err) {
      setLinkedInDraftError(
        err instanceof Error ? err.message : "Failed to save draft",
      );
      setIsStartingLinkedInPost(false);
    }
  };

  if (isLoadingPost) {
    return <div className="container py-12">Loading…</div>;
  }

  if (loadError || !post) {
    return <div className="container py-12 text-red-600">{loadError}</div>;
  }

  if (post.isBlogpost) {
    return (
      <div className="container py-12">
        <p className="text-gray-600 dark:text-gray-400">
          Social mailings are only available for presentation posts.
        </p>
      </div>
    );
  }

  const canSendLive =
    record?.status === "tested" && record.testRecipients.length > 0;

  const isSpeakerPromoted =
    Boolean(post.speakerLinkedInUrn) &&
    post.speakerLinkedInUrn === linkedInSpeakerUrn;

  let draftButtonLabel = "Create draft campaign";
  if (isDrafting) {
    draftButtonLabel = "Creating draft…";
  } else if (record?.campaignId) {
    draftButtonLabel = "Recreate draft from current content";
  }

  let sendSectionContent: ReactNode;
  if (!canSendLive) {
    sendSectionContent = (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        A successful test send is required before sending live.
      </p>
    );
  } else if (record?.status === "sent") {
    sendSectionContent = (
      <p className="text-sm text-green-700 dark:text-green-400">
        This campaign has already been sent.
      </p>
    );
  } else {
    sendSectionContent = (
      <>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Type the post title to confirm sending to the full audience:{" "}
          <span className="font-mono">{post.title}</span>. This cannot be
          undone.
        </p>
        <input
          type="text"
          aria-label="Confirm send"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white mb-3"
        />
        <button
          type="button"
          onClick={sendLive}
          disabled={isSending || confirmText !== post.title}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 disabled:opacity-50"
        >
          {isSending ? "Sending…" : "Send to full audience"}
        </button>
        {sendError && <p className="mt-2 text-sm text-red-600">{sendError}</p>}
      </>
    );
  }

  return (
    <div className="container py-12 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mailchimp announcement
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {post.title}
          </p>
        </div>
        <Link
          href={`/admin/posts/${slug}/edit`}
          className="text-sm text-etsa-primary hover:text-etsa-primary-dark"
        >
          Back to post
        </Link>
      </div>

      {!isLoadingStatus && record && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Status:
          </span>
          <StatusBadge status={record.status} />
          {record.campaignUrl && (
            <a
              href={record.campaignUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-etsa-primary hover:text-etsa-primary-dark underline"
            >
              Open in Mailchimp ↗
            </a>
          )}
          {record.sentAt && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              sent {new Date(record.sentAt).toLocaleString()} by {record.sentBy}
            </span>
          )}
        </div>
      )}

      {/* Compose */}
      <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          1. Compose
        </h2>
        <dl className="space-y-3 text-sm mb-4">
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">
              Talk title
            </dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {post.title || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">
              Speaker name
            </dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {post.speakerName || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">
              Company
            </dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {post.company || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">
              Bio
            </dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {post.bio || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">
              Date
            </dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {post.date || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 dark:text-gray-300">
              Abstract
            </dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {post.abstract || "—"}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={createDraft}
          disabled={isDrafting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary disabled:opacity-50"
        >
          {draftButtonLabel}
        </button>
        {draftError && (
          <p className="mt-2 text-sm text-red-600">{draftError}</p>
        )}
      </section>

      {/* Test */}
      <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          2. Send test
        </h2>
        {!record?.campaignId ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create a draft first.
          </p>
        ) : (
          <>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Search contacts by name or email…"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white mb-2"
            />
            {isSearching && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Searching…
              </p>
            )}
            {searchResults.length > 0 && (
              <ul className="mb-3 border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700 max-h-48 overflow-y-auto">
                {searchResults.map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={() => addRecipient(contact)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {contact.name ? `${contact.name} — ` : ""}
                      {contact.email}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedRecipients.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedRecipients.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-etsa-primary/10 text-etsa-primary"
                  >
                    {r.email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(r.id)}
                      aria-label={`Remove ${r.email}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={sendTest}
              disabled={isSendingTest || selectedRecipients.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary disabled:opacity-50"
            >
              {isSendingTest ? "Sending test…" : "Send test"}
            </button>
            {testError && (
              <p className="mt-2 text-sm text-red-600">{testError}</p>
            )}
            {record.testRecipients.length > 0 && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Test sent to: {record.testRecipients.join(", ")}
              </p>
            )}
          </>
        )}
      </section>

      {/* Send */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          3. Send to audience
        </h2>
        {sendSectionContent}
      </section>

      {/* LinkedIn */}
      <section className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          LinkedIn
        </h2>
        {linkedInBanner && (
          <p
            className={`mb-3 text-sm ${
              linkedInBanner.type === "success"
                ? "text-green-700 dark:text-green-400"
                : "text-red-600"
            }`}
          >
            {linkedInBanner.message}
          </p>
        )}
        {!isLoadingLinkedIn && linkedInRecord?.status === "sent" ? (
          <p className="text-sm text-green-700 dark:text-green-400">
            Posted
            {linkedInRecord.sentAt &&
              ` ${new Date(linkedInRecord.sentAt).toLocaleString()}`}{" "}
            by {linkedInRecord.sentBy}.{" "}
            {linkedInRecord.campaignUrl && (
              <a
                href={linkedInRecord.campaignUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-etsa-primary hover:text-etsa-primary-dark underline"
              >
                View on LinkedIn ↗
              </a>
            )}
          </p>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Post text
            </h3>
            {isLinkedInDraftLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Loading…
              </p>
            ) : (
              <>
                <textarea
                  value={linkedInDraftText}
                  onChange={(e) => {
                    setLinkedInDraftText(e.target.value);
                    setLinkedInDraftSaved(false);
                  }}
                  rows={8}
                  maxLength={3000}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white mb-1 font-mono"
                />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {linkedInDraftText.length}/3000
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={resetLinkedInDraftToTemplate}
                      disabled={isResettingLinkedInDraft}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline disabled:opacity-50"
                    >
                      {isResettingLinkedInDraft
                        ? "Resetting…"
                        : "Reset to template"}
                    </button>
                    <button
                      type="button"
                      onClick={saveLinkedInDraft}
                      disabled={isSavingLinkedInDraft}
                      className="text-xs text-etsa-primary hover:text-etsa-primary-dark underline disabled:opacity-50"
                    >
                      {isSavingLinkedInDraft
                        ? "Saving…"
                        : linkedInDraftSaved
                          ? "Saved!"
                          : "Save draft"}
                    </button>
                  </div>
                </div>
              </>
            )}
            {linkedInDraftError && (
              <p className="text-sm text-red-600 mb-3">{linkedInDraftError}</p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Posting requires your own LinkedIn login and admin access to the
              ETSA company page. No credentials are stored - you authorize each
              post individually. The text above (including any unsaved edits) is
              what gets posted.
            </p>
            <button
              type="button"
              onClick={startLinkedInPost}
              disabled={isStartingLinkedInPost || isLinkedInDraftLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-etsa-primary hover:bg-etsa-primary-dark disabled:opacity-50"
            >
              {isStartingLinkedInPost ? "Saving…" : "Post to LinkedIn"}
            </button>
          </>
        )}
        {post.speakerName && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Speaker mention:{" "}
            {isLinkedInSpeakerConnected ? (
              <>
                <span className="text-green-700 dark:text-green-400">
                  {post.speakerName} will be tagged.
                </span>{" "}
                <button
                  type="button"
                  onClick={unlinkSpeakerLinkedIn}
                  disabled={isUnlinking}
                  className="text-red-600 hover:text-red-700 underline disabled:opacity-50"
                >
                  {isUnlinking ? "Unlinking…" : "Unlink"}
                </button>
                {unlinkError && (
                  <span className="block text-xs text-red-600 mt-1">
                    {unlinkError}
                  </span>
                )}{" "}
                {(() => {
                  if (promotePrUrl) {
                    return (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <a
                          href={promotePrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-etsa-primary hover:text-etsa-primary-dark underline"
                        >
                          View PR{" "}
                          {promotePrNumber ? `#${promotePrNumber} ` : ""}↗
                        </a>{" "}
                        {promoteAutoMerge
                          ? "- auto-merging."
                          : "- auto-merge couldn't be enabled, merge it manually."}
                      </span>
                    );
                  }
                  if (isSpeakerPromoted) {
                    return (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ✓ Already in frontmatter
                      </span>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={promoteSpeakerLinkedIn}
                      disabled={isPromoting}
                      className="text-etsa-primary hover:text-etsa-primary-dark underline disabled:opacity-50"
                    >
                      {isPromoting ? "Opening PR…" : "Promote to frontmatter"}
                    </button>
                  );
                })()}
                {promoteError && (
                  <span className="block text-xs text-red-600 mt-1">
                    {promoteError}
                  </span>
                )}
              </>
            ) : (
              <>
                <span>
                  {post.speakerName} hasn&apos;t connected LinkedIn - the post
                  will link their profile instead of tagging them. Send them
                  this link (it doesn&apos;t require an ETSA admin login):
                </span>{" "}
                <button
                  type="button"
                  onClick={copySpeakerInviteLink}
                  className="text-etsa-primary hover:text-etsa-primary-dark underline"
                >
                  {copyLinkStatus === "copied"
                    ? "Link copied!"
                    : "Copy invite link"}
                </button>
                {copyLinkStatus === "failed" && (
                  <span className="block text-xs text-red-600 mt-1">
                    Couldn&apos;t copy automatically - copy this link manually:{" "}
                    <span className="font-mono break-all">
                      {`${
                        window.location.origin
                      }/api/admin/posts/${slug}/social/linkedin/speaker/authorize?speaker=${encodeURIComponent(
                        post.speakerName,
                      )}`}
                    </span>
                  </span>
                )}
                {unlinkPrUrl && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Also removed from frontmatter:{" "}
                    <a
                      href={unlinkPrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-etsa-primary hover:text-etsa-primary-dark underline"
                    >
                      View PR {unlinkPrNumber ? `#${unlinkPrNumber} ` : ""}↗
                    </a>
                  </span>
                )}
              </>
            )}
          </p>
        )}
      </section>
    </div>
  );
}
