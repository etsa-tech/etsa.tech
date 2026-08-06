"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { clusterEntriesByName, type NamedEntry } from "@/lib/name-matching";

interface SheetRsvpRow {
  firstName: string;
  lastName: string;
  email: string;
  canAttend: string;
  timestamp: string;
  comments: string;
}

interface SheetData {
  postTitle: string;
  sheet: { rows: SheetRsvpRow[]; error: string | null };
}

interface MeetupData {
  postTitle: string;
  meetup: {
    eventId: string | null;
    eventUrl: string | null;
    attendeesUrl: string | null;
    count: number | null;
    title: string | null;
    dateTime: string | null;
    matchedByTitle: boolean;
    sampleAttendeeNames: string[];
    error: string | null;
  };
}

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface CsvAttendee {
  name: string;
}

// Minimal RFC4180-ish CSV parser - handles quoted fields, escaped quotes,
// and CRLF/LF line endings. Runs entirely client-side; nothing uploaded.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function parseAttendeesCsv(text: string): CsvAttendee[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const firstNameIdx = headers.findIndex(
    (h) => h.includes("first") && h.includes("name"),
  );
  const lastNameIdx = headers.findIndex(
    (h) => h.includes("last") && h.includes("name"),
  );
  const nameIdx = headers.findIndex(
    (h) =>
      h.includes("name") &&
      !h.includes("first") &&
      !h.includes("last") &&
      !h.includes("event") &&
      !h.includes("group"),
  );

  return rows
    .slice(1)
    .map((cells) => {
      let name = "";
      if (firstNameIdx !== -1 || lastNameIdx !== -1) {
        name = [cells[firstNameIdx] ?? "", cells[lastNameIdx] ?? ""]
          .filter(Boolean)
          .join(" ")
          .trim();
      } else if (nameIdx !== -1) {
        name = (cells[nameIdx] ?? "").trim();
      }
      return { name };
    })
    .filter((a) => a.name.length > 0);
}

const SOURCE_SHEET = "Google Sheet";
const SOURCE_MEETUP = "Meetup";
const SOURCE_CSV = "Meetup (CSV export)";

function InlineSpinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-etsa-primary align-[-2px]" />
  );
}

export default function RsvpReportPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [isMounted, setIsMounted] = useState(false);

  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [isSheetLoading, setIsSheetLoading] = useState(true);
  const [sheetLoadError, setSheetLoadError] = useState<string | null>(null);

  const [meetupData, setMeetupData] = useState<MeetupData | null>(null);
  const [isMeetupLoading, setIsMeetupLoading] = useState(true);
  const [meetupLoadError, setMeetupLoadError] = useState<string | null>(null);

  const [csvAttendees, setCsvAttendees] = useState<CsvAttendee[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvParseWarning, setCsvParseWarning] = useState<string | null>(null);
  const [manualEstimate, setManualEstimate] = useState<number>(0);

  const [dedupeEnabled, setDedupeEnabled] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.9);

  const [manualMeetupId, setManualMeetupId] = useState("");
  const [isSavingMeetupId, setIsSavingMeetupId] = useState(false);
  const [saveMeetupMessage, setSaveMeetupMessage] = useState<{
    prefix: string;
    suffix: string;
    prNumber?: number;
    prUrl?: string;
  } | null>(null);

  // Loading text below depends on client-only state (which source is still
  // pending) - gate it behind mount so the server-rendered HTML and the
  // first client render match, then swap in the real status after hydration.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const saveMeetupEventId = async (eventId: string) => {
    if (!eventId) return;
    setIsSavingMeetupId(true);
    setSaveMeetupMessage(null);
    try {
      const getResponse = await fetch(`/api/admin/posts/${slug}`);
      if (!getResponse.ok) throw new Error("Failed to load post");
      const { frontmatter, content } = await getResponse.json();

      // main is branch-protected, so this goes through the same PR flow as
      // every other post edit in the admin (createPR: true) rather than
      // attempting a direct commit, which GitHub rejects. autoMerge is only
      // set here - a narrow, metadata-only change - not on general content
      // edits, which still go through normal review.
      const putResponse = await fetch(`/api/admin/posts/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontmatter: { ...frontmatter, meetupEventId: eventId },
          content,
          createPR: true,
          autoMerge: true,
        }),
      });
      if (!putResponse.ok) throw new Error("Failed to save");
      const result = await putResponse.json();
      setSaveMeetupMessage({
        prefix: result.isNewPR ? "Opened" : "Added to existing",
        suffix: result.autoMergeEnabled
          ? "- it'll merge itself automatically once checks pass."
          : "with this change - merge it on GitHub to apply.",
        prNumber: result.prNumber,
        prUrl: result.prUrl,
      });
    } catch (err) {
      setSaveMeetupMessage({
        prefix: "Failed to save the Meetup Event ID.",
        suffix: "",
      });
      console.error("Error saving meetupEventId:", err);
    } finally {
      setIsSavingMeetupId(false);
    }
  };

  // Sheet and Meetup are fetched independently (separate API routes) so the
  // page can show which one is still loading instead of one opaque spinner
  // gating everything until both are done.
  useEffect(() => {
    if (!slug) return;

    setIsSheetLoading(true);
    setSheetLoadError(null);
    fetch(`/api/admin/posts/${slug}/rsvps/sheet`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load Sheet RSVPs");
        return response.json();
      })
      .then(setSheetData)
      .catch((err) => {
        setSheetLoadError("Failed to load Google Sheet RSVPs.");
        console.error("Error loading Sheet RSVPs:", err);
      })
      .finally(() => setIsSheetLoading(false));

    setIsMeetupLoading(true);
    setMeetupLoadError(null);
    fetch(`/api/admin/posts/${slug}/rsvps/meetup`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load Meetup RSVPs");
        return response.json();
      })
      .then(setMeetupData)
      .catch((err) => {
        setMeetupLoadError("Failed to load Meetup RSVPs.");
        console.error("Error loading Meetup RSVPs:", err);
      })
      .finally(() => setIsMeetupLoading(false));
  }, [slug]);

  const handleCsvUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const attendees = parseAttendeesCsv(text);
    setCsvFileName(file.name);
    setCsvAttendees(attendees);
    setCsvParseWarning(
      attendees.length === 0
        ? "Couldn't find a name column in this CSV - check that it's the guest list export from the Meetup event dashboard."
        : null,
    );
  };

  const postTitle = sheetData?.postTitle || meetupData?.postTitle || "";
  const meetup = meetupData?.meetup ?? null;

  // Every individually-named RSVP we have, from every source. Meetup only
  // ever contributes up to 5 names (see src/lib/meetup.ts) - the rest of
  // its count has no identity and is added to the total separately below.
  const namedEntries = useMemo<NamedEntry[]>(() => {
    const sheetEntries: NamedEntry[] = (sheetData?.sheet.rows ?? []).map(
      (row) => ({
        name: `${row.firstName} ${row.lastName}`.trim(),
        source: SOURCE_SHEET,
        timestamp: row.timestamp,
        comments: row.comments,
      }),
    );
    const meetupEntries: NamedEntry[] = (meetup?.sampleAttendeeNames ?? []).map(
      (name) => ({ name, source: SOURCE_MEETUP }),
    );
    const csvEntries: NamedEntry[] = csvAttendees.map((a) => ({
      name: a.name,
      source: SOURCE_CSV,
    }));
    return [...sheetEntries, ...meetupEntries, ...csvEntries];
  }, [sheetData, meetup, csvAttendees]);

  const displayClusters = useMemo(() => {
    if (dedupeEnabled) {
      return clusterEntriesByName(namedEntries, confidenceThreshold);
    }
    return namedEntries.map((entry) => ({
      name: entry.name,
      sources: [entry.source],
      timestamp: entry.timestamp,
      mergedFrom: [entry],
      primaryEntry: entry,
    }));
  }, [namedEntries, dedupeEnabled, confidenceThreshold]);

  const sheetCount = sheetData?.sheet.rows.length ?? 0;
  const csvCount = csvAttendees.length;
  // Once a Meetup CSV export is uploaded it's the authoritative attendee
  // list for Meetup - the "names not available" gap only makes sense when
  // all we have is the anonymous count plus a handful of sample names.
  const unnamedMeetupCount =
    csvCount > 0
      ? 0
      : Math.max(
          0,
          (meetup?.count ?? 0) - (meetup?.sampleAttendeeNames.length ?? 0),
        );
  const total = displayClusters.length + unnamedMeetupCount + manualEstimate;
  const isAnythingLoading = isSheetLoading || isMeetupLoading;
  const pendingSources = [
    isSheetLoading && "Google Sheet",
    isMeetupLoading && "Meetup",
  ].filter((source): source is string => Boolean(source));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/posts"
          className="text-sm text-etsa-primary hover:text-etsa-primary-dark"
        >
          &larr; Back to Posts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          RSVP Report{postTitle ? `: ${postTitle}` : ""}
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Combines RSVPs from the site&apos;s Google Sheet, Meetup, an uploaded
          Meetup guest-list CSV, and a manual walk-in estimate. Nothing on this
          page is saved - re-open it fresh each time you need the number.
        </p>
        {isMounted && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {pendingSources.length > 0 ? (
              <>
                <InlineSpinner /> Loading: {pendingSources.join(", ")}…
              </>
            ) : (
              "All sources loaded."
            )}
            {sheetLoadError && (
              <span className="ml-2 text-red-600 dark:text-red-400">
                Google Sheet failed to load.
              </span>
            )}
            {meetupLoadError && (
              <span className="ml-2 text-red-600 dark:text-red-400">
                Meetup failed to load.
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Google Sheet
          </p>
          {!isMounted || isSheetLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <InlineSpinner /> Loading Google Sheet…
            </p>
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {sheetCount}
            </p>
          )}
          {sheetLoadError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {sheetLoadError}
            </p>
          )}
          {sheetData?.sheet.error && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {sheetData.sheet.error}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Meetup</p>
          {!isMounted || isMeetupLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <InlineSpinner /> Loading Meetup…
            </p>
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {meetup?.count ?? "—"}
            </p>
          )}
          {meetup && meetup.sampleAttendeeNames.length > 0 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {meetup.sampleAttendeeNames.length} named below
              {unnamedMeetupCount > 0
                ? `, ${unnamedMeetupCount} more without names`
                : ""}
              .
            </p>
          )}
          {meetupLoadError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {meetupLoadError}
            </p>
          )}
          {meetup?.error && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {meetup.error}
            </p>
          )}
          {meetup?.eventId && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Meetup event:{" "}
              {meetup.eventUrl ? (
                <a
                  href={meetup.eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-etsa-primary hover:text-etsa-primary-dark underline"
                >
                  {meetup.eventId}
                </a>
              ) : (
                meetup.eventId
              )}
            </p>
          )}
          {meetup?.matchedByTitle && meetup.eventId && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auto-matched by title.
              </p>
              <button
                type="button"
                disabled={isSavingMeetupId}
                onClick={() => saveMeetupEventId(meetup.eventId!)}
                className="mt-1 text-xs text-etsa-primary hover:text-etsa-primary-dark disabled:opacity-50"
              >
                {isSavingMeetupId
                  ? "Saving..."
                  : "Save to post for faster lookup next time"}
              </button>
            </div>
          )}
          {meetup && !meetup.eventId && (
            <div className="mt-2 space-y-1">
              <label
                htmlFor="manualMeetupId"
                className="block text-xs text-gray-500 dark:text-gray-400"
              >
                No match found - set the Meetup Event ID manually:
              </label>
              <div className="flex gap-2">
                <input
                  id="manualMeetupId"
                  type="text"
                  value={manualMeetupId}
                  onChange={(e) => setManualMeetupId(e.target.value)}
                  placeholder="e.g. 311641435"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary text-xs"
                />
                <button
                  type="button"
                  disabled={isSavingMeetupId || !manualMeetupId}
                  onClick={() => saveMeetupEventId(manualMeetupId)}
                  className="text-xs px-2 py-1 rounded bg-etsa-primary text-white hover:bg-etsa-primary-dark disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          )}
          {saveMeetupMessage && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {saveMeetupMessage.prefix}{" "}
              {saveMeetupMessage.prUrl && saveMeetupMessage.prNumber && (
                <a
                  href={saveMeetupMessage.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-etsa-primary hover:text-etsa-primary-dark underline"
                >
                  PR #{saveMeetupMessage.prNumber}
                </a>
              )}{" "}
              {saveMeetupMessage.suffix}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Meetup CSV upload
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {csvCount}
          </p>
        </div>
        <div className="bg-etsa-primary/10 dark:bg-etsa-primary/20 shadow rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total for partners
          </p>
          <p className="text-2xl font-bold text-etsa-primary">{total}</p>
          <dl className="mt-2 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between gap-4">
              <dt>Google Sheet</dt>
              <dd>{sheetCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Meetup</dt>
              <dd>{meetup?.count ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Meetup CSV upload</dt>
              <dd>{csvCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Manual estimate</dt>
              <dd>{manualEstimate}</dd>
            </div>
          </dl>
          {dedupeEnabled && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Raw per-source counts above may not sum to the total - dedup is
              on.
            </p>
          )}
          {isAnythingLoading && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Still loading - this number may change.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
        <div>
          <label
            htmlFor="csvUpload"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Upload Meetup guest-list CSV
          </label>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Download this from the event&apos;s attendee list on meetup.com.
            Parsed in your browser only - nothing is sent anywhere.
          </p>
          {meetup?.attendeesUrl && (
            <a
              href={meetup.attendeesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-etsa-primary hover:text-etsa-primary-dark underline"
            >
              Open the Meetup attendee list to export the CSV ↗
            </a>
          )}
          <input
            id="csvUpload"
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            className="mt-2 block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-etsa-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-etsa-primary-dark"
          />
          {csvFileName && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Loaded {csvFileName}: {csvCount} attendee
              {csvCount === 1 ? "" : "s"}
            </p>
          )}
          {csvParseWarning && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {csvParseWarning}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="manualEstimate"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Estimated walk-ins (no RSVP anywhere)
          </label>
          <input
            id="manualEstimate"
            type="number"
            min={0}
            value={manualEstimate}
            onChange={(e) =>
              setManualEstimate(Math.max(0, Number(e.target.value) || 0))
            }
            className="mt-1 block w-32 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center gap-2">
            <input
              id="dedupeEnabled"
              type="checkbox"
              checked={dedupeEnabled}
              onChange={(e) => setDedupeEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-etsa-primary focus:ring-etsa-primary"
            />
            <label
              htmlFor="dedupeEnabled"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Deduplicate similar names across sources
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Uses Jaro-Winkler name similarity (handles minor spelling
            differences, nicknames like &quot;Ben&quot; vs &quot;Ben
            Taylor&quot;, and the same person submitting twice) to merge
            duplicate entries. Turn off to see every raw entry unmerged.
          </p>
          {dedupeEnabled && (
            <div className="mt-3">
              <label
                htmlFor="confidenceThreshold"
                className="block text-xs text-gray-500 dark:text-gray-400"
              >
                Match confidence: {confidenceThreshold.toFixed(2)} (higher =
                only merge very close matches)
              </label>
              <input
                id="confidenceThreshold"
                type="range"
                min={0.7}
                max={1}
                step={0.01}
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="mt-1 block w-full max-w-xs"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                RSVP&apos;d
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Comments and/or questions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayClusters.map((cluster, idx) => (
              <tr key={`cluster-${idx}`}>
                <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                  {cluster.name}
                  {cluster.mergedFrom.length > 1 && (
                    <span className="block text-xs text-gray-400 dark:text-gray-500">
                      also matched:{" "}
                      {cluster.mergedFrom
                        .filter((e) => e !== cluster.primaryEntry)
                        .map((e) =>
                          e.name === cluster.primaryEntry.name
                            ? `duplicate (${e.source})`
                            : `${e.name} (${e.source})`,
                        )
                        .join(", ")}
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {cluster.sources.join(", ")}
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {formatTimestamp(cluster.timestamp)}
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {cluster.primaryEntry.comments || "—"}
                </td>
              </tr>
            ))}
            {unnamedMeetupCount > 0 && (
              <tr>
                <td className="px-6 py-3 text-sm text-gray-900 dark:text-white italic">
                  {unnamedMeetupCount} additional Meetup RSVP
                  {unnamedMeetupCount === 1 ? "" : "s"} (names not available)
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Meetup
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                  —
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                  —
                </td>
              </tr>
            )}
            {manualEstimate > 0 && (
              <tr>
                <td className="px-6 py-3 text-sm text-gray-900 dark:text-white italic">
                  {manualEstimate} estimated walk-in
                  {manualEstimate === 1 ? "" : "s"}
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Manual estimate
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                  —
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                  —
                </td>
              </tr>
            )}
            {displayClusters.length === 0 &&
              unnamedMeetupCount === 0 &&
              manualEstimate === 0 &&
              !isAnythingLoading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-6 text-sm text-center text-gray-500 dark:text-gray-400"
                  >
                    No RSVPs yet from any source.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
