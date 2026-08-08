"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  clusterEntriesByName,
  type EntryCluster,
  type NamedEntry,
} from "@/lib/name-matching";

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

interface CsvParseState {
  rows: string[][];
  row: string[];
  field: string;
  inQuotes: boolean;
}

function endCsvRow(state: CsvParseState): void {
  state.row.push(state.field);
  state.rows.push(state.row);
  state.row = [];
  state.field = "";
}

// Returns how many extra characters this char consumed (0 or 1, for \r\n).
function consumeQuotedCsvChar(
  state: CsvParseState,
  char: string,
  next: string | undefined,
): number {
  if (char === '"' && next === '"') {
    state.field += '"';
    return 1;
  }
  if (char === '"') {
    state.inQuotes = false;
    return 0;
  }
  state.field += char;
  return 0;
}

function consumeUnquotedCsvChar(
  state: CsvParseState,
  char: string,
  next: string | undefined,
): number {
  if (char === '"') {
    state.inQuotes = true;
    return 0;
  }
  if (char === ",") {
    state.row.push(state.field);
    state.field = "";
    return 0;
  }
  if (char === "\n" || char === "\r") {
    const extraConsumed = char === "\r" && next === "\n" ? 1 : 0;
    endCsvRow(state);
    return extraConsumed;
  }
  state.field += char;
  return 0;
}

// Minimal RFC4180-ish CSV parser - handles quoted fields, escaped quotes,
// and CRLF/LF line endings. Runs entirely client-side; nothing uploaded.
function parseCsv(text: string): string[][] {
  const state: CsvParseState = {
    rows: [],
    row: [],
    field: "",
    inQuotes: false,
  };

  for (let i = 0; i < text.length; i++) {
    const extraConsumed = state.inQuotes
      ? consumeQuotedCsvChar(state, text[i], text[i + 1])
      : consumeUnquotedCsvChar(state, text[i], text[i + 1]);
    i += extraConsumed;
  }

  if (state.field.length > 0 || state.row.length > 0) {
    endCsvRow(state);
  }

  return state.rows.filter((r) => r.some((cell) => cell.trim() !== ""));
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
const SOURCE_MANUAL = "Manual estimate";

type SortColumn = "name" | "source" | "timestamp" | "comments";

type TableRow =
  | {
      kind: "cluster";
      key: string;
      name: string;
      sources: string[];
      timestamp?: string;
      comments: string;
      cluster: EntryCluster;
    }
  | { kind: "unnamedMeetup"; key: string; name: string; sources: string[] }
  | { kind: "manualEstimate"; key: string; name: string; sources: string[] };

// How long the report must sit unchanged before it's auto-saved to the
// Netlify Blobs cache.
const AUTOSAVE_DELAY_MS = 10000;

interface CachedReportData {
  sheetData: SheetData | null;
  meetupData: MeetupData | null;
  csvAttendees: CsvAttendee[];
  csvFileName: string | null;
  manualEstimate: number;
  dedupeEnabled: boolean;
  confidenceThreshold: number;
}

function InlineSpinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-etsa-primary align-[-2px]" />
  );
}

function SortableHeaderCell({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: Readonly<{
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: "asc" | "desc";
  onSort: (column: SortColumn) => void;
}>) {
  const isActive = activeColumn === column;
  let indicator = "";
  if (isActive) {
    indicator = direction === "asc" ? "▲" : "▼";
  }
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
      >
        {label}
        <span className="inline-block w-3 text-[10px] normal-case">
          {indicator}
        </span>
      </button>
    </th>
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

  // Cached-report state: loaded once on mount from Netlify Blobs, then
  // auto-saved back after AUTOSAVE_DELAY_MS of no further edits.
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [autosaveDeadline, setAutosaveDeadline] = useState<number | null>(null);
  const [secondsUntilAutosave, setSecondsUntilAutosave] = useState<
    number | null
  >(null);

  // Table view state - filtering/sorting is presentation-only, not part of
  // the cached report.
  const [tableFilterText, setTableFilterText] = useState("");
  const [tableSourceFilter, setTableSourceFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Loading text below depends on client-only state (which source is still
  // pending) - gate it behind mount so the server-rendered HTML and the
  // first client render match, then swap in the real status after hydration.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Looks up an arbitrary Meetup event ID live, independent of whether it's
  // been saved to the post's frontmatter yet - so a manually-entered ID
  // shows real attendee data immediately instead of only after the PR
  // merges and the page is reloaded.
  const queryMeetupEventId = async (eventId: string) => {
    if (!eventId) return;
    setIsMeetupLoading(true);
    setMeetupLoadError(null);
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}/rsvps/meetup?eventId=${encodeURIComponent(
          eventId,
        )}`,
      );
      if (!response.ok) throw new Error("Failed to load Meetup RSVPs");
      const data = await response.json();
      setMeetupData(data);
      setIsDirty(true);
    } catch (err) {
      setMeetupLoadError("Failed to load Meetup RSVPs.");
      console.error("Error querying manual Meetup Event ID:", err);
    } finally {
      setIsMeetupLoading(false);
    }
  };

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
  // gating everything until both are done. Marks the report dirty once both
  // land, so a fresh pull from sources gets auto-saved back to the cache.
  const loadFromSources = () => {
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
      .finally(() => {
        setIsSheetLoading(false);
        setIsDirty(true);
      });

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
      .finally(() => {
        setIsMeetupLoading(false);
        setIsDirty(true);
      });
  };

  // On mount, look for a cached report before hitting Sheet/Meetup live -
  // the cache is the fast path, live sources are only pulled when there's
  // nothing cached yet or the user explicitly asks for a refresh.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setIsLoadingCache(true);
      try {
        const response = await fetch(`/api/admin/posts/${slug}/rsvps/cache`);
        if (response.ok) {
          const { cached } = await response.json();
          if (cached && !cancelled) {
            const data = cached.data as CachedReportData;
            setSheetData(data.sheetData ?? null);
            setMeetupData(data.meetupData ?? null);
            setCsvAttendees(data.csvAttendees ?? []);
            setCsvFileName(data.csvFileName ?? null);
            setManualEstimate(data.manualEstimate ?? 0);
            setDedupeEnabled(data.dedupeEnabled ?? true);
            setConfidenceThreshold(data.confidenceThreshold ?? 0.9);
            setCachedAt(cached.savedAt);
            setIsSheetLoading(false);
            setIsMeetupLoading(false);
            setIsLoadingCache(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error loading cached RSVP report:", err);
      }
      if (!cancelled) {
        setIsLoadingCache(false);
        loadFromSources();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const saveReport = async () => {
    if (!slug) return;
    setIsSavingReport(true);
    try {
      const payload: CachedReportData = {
        sheetData,
        meetupData,
        csvAttendees,
        csvFileName,
        manualEstimate,
        dedupeEnabled,
        confidenceThreshold,
      };
      const response = await fetch(`/api/admin/posts/${slug}/rsvps/cache`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save report");
      const { cached } = await response.json();
      setCachedAt(cached.savedAt);
      setIsDirty(false);
      setSaveNotification("Report saved.");
    } catch (err) {
      console.error("Error saving RSVP report:", err);
      setSaveNotification("Failed to save report.");
    } finally {
      setIsSavingReport(false);
    }
  };

  // Auto-save once the report has sat unchanged for AUTOSAVE_DELAY_MS - any
  // further edit resets this timer via the dependency array below.
  useEffect(() => {
    if (!isDirty || isLoadingCache) {
      setAutosaveDeadline(null);
      return;
    }
    setAutosaveDeadline(Date.now() + AUTOSAVE_DELAY_MS);
    const timer = setTimeout(() => {
      saveReport();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDirty,
    isLoadingCache,
    sheetData,
    meetupData,
    csvAttendees,
    csvFileName,
    manualEstimate,
    dedupeEnabled,
    confidenceThreshold,
  ]);

  // Ticks the "saving in Ns" countdown shown next to "Unsaved changes." -
  // purely cosmetic, doesn't drive the actual save (the timer above does).
  useEffect(() => {
    if (autosaveDeadline === null) {
      setSecondsUntilAutosave(null);
      return;
    }
    const update = () => {
      setSecondsUntilAutosave(
        Math.max(0, Math.ceil((autosaveDeadline - Date.now()) / 1000)),
      );
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [autosaveDeadline]);

  useEffect(() => {
    if (!saveNotification) return;
    const timer = setTimeout(() => setSaveNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [saveNotification]);

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
    setIsDirty(true);
  };

  const postTitle = sheetData?.postTitle || meetupData?.postTitle || "";
  const meetup = meetupData?.meetup ?? null;

  // Every individually-named RSVP we have, from every source. Meetup only
  // ever contributes up to 5 names (see src/lib/meetup.ts) - the rest of
  // its count has no identity and is added to the total separately below.
  const namedEntries = useMemo<NamedEntry[]>(() => {
    const sheetEntries: NamedEntry[] = (sheetData?.sheet.rows ?? []).map(
      (row, i) => ({
        id: `${SOURCE_SHEET}-${i}`,
        name: `${row.firstName} ${row.lastName}`.trim(),
        source: SOURCE_SHEET,
        timestamp: row.timestamp,
        comments: row.comments,
      }),
    );
    const meetupEntries: NamedEntry[] = (meetup?.sampleAttendeeNames ?? []).map(
      (name, i) => ({
        id: `${SOURCE_MEETUP}-${i}`,
        name,
        source: SOURCE_MEETUP,
      }),
    );
    const csvEntries: NamedEntry[] = csvAttendees.map((a, i) => ({
      id: `${SOURCE_CSV}-${i}`,
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

  // One row per line in the table below - named clusters plus the two
  // aggregate "no identity" rows, unified so filtering/sorting can treat
  // them the same way.
  const tableRows = useMemo<TableRow[]>(() => {
    const rows: TableRow[] = displayClusters.map((cluster) => ({
      kind: "cluster",
      key: cluster.mergedFrom.map((e) => e.id).join("|"),
      name: cluster.name,
      sources: cluster.sources,
      timestamp: cluster.timestamp,
      comments: cluster.primaryEntry.comments || "",
      cluster,
    }));
    if (unnamedMeetupCount > 0) {
      rows.push({
        kind: "unnamedMeetup",
        key: "unnamed-meetup",
        name: `${unnamedMeetupCount} additional Meetup RSVP${
          unnamedMeetupCount === 1 ? "" : "s"
        } (names not available)`,
        sources: [SOURCE_MEETUP],
      });
    }
    if (manualEstimate > 0) {
      rows.push({
        kind: "manualEstimate",
        key: "manual-estimate",
        name: `${manualEstimate} estimated walk-in${
          manualEstimate === 1 ? "" : "s"
        }`,
        sources: [SOURCE_MANUAL],
      });
    }
    return rows;
  }, [displayClusters, unnamedMeetupCount, manualEstimate]);

  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    tableRows.forEach((row) => row.sources.forEach((s) => sources.add(s)));
    return Array.from(sources).sort((a, b) => a.localeCompare(b));
  }, [tableRows]);

  const filteredRows = useMemo(() => {
    const needle = tableFilterText.trim().toLowerCase();
    return tableRows.filter((row) => {
      if (
        tableSourceFilter !== "all" &&
        !row.sources.includes(tableSourceFilter)
      ) {
        return false;
      }
      if (!needle) return true;
      const comments = row.kind === "cluster" ? row.comments : "";
      const haystack = `${row.name} ${row.sources.join(
        " ",
      )} ${comments}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [tableRows, tableFilterText, tableSourceFilter]);

  const sortedRows = useMemo(() => {
    const sortValue = (row: TableRow): string => {
      switch (sortColumn) {
        case "name":
          return row.name;
        case "source":
          return row.sources.join(", ");
        case "comments":
          return row.kind === "cluster" ? row.comments : "";
        case "timestamp":
          return "";
      }
    };
    const sorted = [...filteredRows].sort((a, b) => {
      if (sortColumn === "timestamp") {
        const aTime =
          a.kind === "cluster" && a.timestamp
            ? new Date(a.timestamp).getTime()
            : null;
        const bTime =
          b.kind === "cluster" && b.timestamp
            ? new Date(b.timestamp).getTime()
            : null;
        if (aTime === null && bTime === null) return 0;
        if (aTime === null) return 1;
        if (bTime === null) return -1;
        return aTime - bTime;
      }
      return sortValue(a).localeCompare(sortValue(b));
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredRows, sortColumn, sortDirection]);

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const escapeCsvField = (value: string): string =>
    /["\r\n,]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

  // Client-side only, same as the CSV upload above - nothing is sent
  // anywhere. One row per person (or per estimated walk-in) so the file
  // stays tabular - no aggregate/summary rows that would break parsing.
  const downloadCsvReport = () => {
    const rows: string[][] = [
      ["Name", "Source", "RSVP'd", "Comments and/or questions"],
    ];
    displayClusters.forEach((cluster) => {
      rows.push([
        cluster.name,
        cluster.sources.join(", "),
        formatTimestamp(cluster.timestamp),
        cluster.primaryEntry.comments || "",
      ]);
    });
    for (let i = 0; i < unnamedMeetupCount; i++) {
      rows.push(["Meetup RSVP (name not available)", "Meetup", "", ""]);
    }
    for (let i = 0; i < manualEstimate; i++) {
      rows.push(["Estimated walk-in", "Manual estimate", "", ""]);
    }

    const csvText = rows
      .map((row) => row.map(escapeCsvField).join(","))
      .join("\r\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rsvp-report-${slug}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  let loadingStatus: React.ReactNode;
  if (isLoadingCache) {
    loadingStatus = (
      <>
        <InlineSpinner /> Checking for a cached report…
      </>
    );
  } else if (pendingSources.length > 0) {
    loadingStatus = (
      <>
        <InlineSpinner /> Loading: {pendingSources.join(", ")}…
      </>
    );
  } else {
    loadingStatus = "All sources loaded.";
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/posts"
          className="text-sm text-etsa-primary hover:text-etsa-primary-dark"
        >
          &larr; Back to Posts
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            RSVP Report{postTitle ? `: ${postTitle}` : ""}
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isLoadingCache || isAnythingLoading}
              onClick={loadFromSources}
              className="text-sm px-3 py-1.5 rounded-md border border-etsa-primary text-etsa-primary hover:bg-etsa-primary/10 disabled:opacity-50"
            >
              Refresh from data sources
            </button>
            <button
              type="button"
              disabled={isLoadingCache || isSavingReport}
              onClick={saveReport}
              className="text-sm px-3 py-1.5 rounded-md border border-etsa-primary text-etsa-primary hover:bg-etsa-primary/10 disabled:opacity-50"
            >
              {isSavingReport ? "Saving..." : "Save now"}
            </button>
            <button
              type="button"
              onClick={downloadCsvReport}
              className="text-sm px-3 py-1.5 rounded-md bg-etsa-primary text-white hover:bg-etsa-primary-dark"
            >
              Download CSV report
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Combines RSVPs from the site&apos;s Google Sheet, Meetup, an uploaded
          Meetup guest-list CSV, and a manual walk-in estimate. Loads the last
          saved report automatically, then auto-saves back to the cache{" "}
          {AUTOSAVE_DELAY_MS / 1000} seconds after you stop making changes.
        </p>
        {isMounted && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {loadingStatus}
            {!isLoadingCache && cachedAt && (
              <span className="ml-2">
                Cached report from {formatTimestamp(cachedAt)}.
              </span>
            )}
            {isSavingReport && (
              <span className="ml-2">
                <InlineSpinner /> Saving report…
              </span>
            )}
            {isDirty && !isSavingReport && (
              <span className="ml-2">
                Unsaved changes - autosaving in{" "}
                {secondsUntilAutosave ?? AUTOSAVE_DELAY_MS / 1000}s.
              </span>
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

      {saveNotification && (
        <output className="fixed bottom-4 right-4 z-50 rounded-md bg-gray-900 dark:bg-gray-700 px-4 py-2 text-sm text-white shadow-lg">
          {saveNotification}
        </output>
      )}

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
                  onClick={() => {
                    saveMeetupEventId(manualMeetupId);
                    queryMeetupEventId(manualMeetupId);
                  }}
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
            onChange={(e) => {
              setManualEstimate(Math.max(0, Number(e.target.value) || 0));
              setIsDirty(true);
            }}
            className="mt-1 block w-32 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center gap-2">
            <input
              id="dedupeEnabled"
              type="checkbox"
              checked={dedupeEnabled}
              onChange={(e) => {
                setDedupeEnabled(e.target.checked);
                setIsDirty(true);
              }}
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
                onChange={(e) => {
                  setConfidenceThreshold(Number(e.target.value));
                  setIsDirty(true);
                }}
                className="mt-1 block w-full max-w-xs"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="tableFilterText"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Filter
          </label>
          <input
            id="tableFilterText"
            type="text"
            value={tableFilterText}
            onChange={(e) => setTableFilterText(e.target.value)}
            placeholder="Search name, source, or comments"
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="tableSourceFilter"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Source
          </label>
          <select
            id="tableSourceFilter"
            value={tableSourceFilter}
            onChange={(e) => setTableSourceFilter(e.target.value)}
            className="mt-1 block rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary text-sm"
          >
            <option value="all">All sources</option>
            {availableSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>
        {(tableFilterText || tableSourceFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setTableFilterText("");
              setTableSourceFilter("all");
            }}
            className="text-sm text-etsa-primary hover:text-etsa-primary-dark"
          >
            Clear filters
          </button>
        )}
        <p className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          Showing {sortedRows.length} of {tableRows.length}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <SortableHeaderCell
                label="Name"
                column="name"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeaderCell
                label="Source"
                column="source"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeaderCell
                label="RSVP'd"
                column="timestamp"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeaderCell
                label="Comments and/or questions"
                column="comments"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedRows.map((row) => {
              if (row.kind === "cluster") {
                const cluster = row.cluster;
                return (
                  <tr key={row.key}>
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
                );
              }
              if (row.kind === "unnamedMeetup") {
                return (
                  <tr key={row.key}>
                    <td className="px-6 py-3 text-sm text-gray-900 dark:text-white italic">
                      {meetup?.attendeesUrl ? (
                        <a
                          href={meetup.attendeesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="not-italic text-etsa-primary hover:text-etsa-primary-dark underline"
                        >
                          {row.name}
                        </a>
                      ) : (
                        row.name
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {SOURCE_MEETUP}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      —
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      —
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={row.key}>
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-white italic">
                    {row.name}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {SOURCE_MANUAL}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                    —
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                    —
                  </td>
                </tr>
              );
            })}
            {sortedRows.length === 0 && !isAnythingLoading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-6 text-sm text-center text-gray-500 dark:text-gray-400"
                >
                  {tableRows.length === 0
                    ? "No RSVPs yet from any source."
                    : "No rows match the current filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
