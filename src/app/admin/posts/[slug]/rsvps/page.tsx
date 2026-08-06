"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SheetRsvpRow {
  firstName: string;
  lastName: string;
  email: string;
  canAttend: string;
  timestamp: string;
}

interface RsvpReport {
  postTitle: string;
  meetupEventId: string | null;
  sheet: { rows: SheetRsvpRow[]; error: string | null };
  meetup: {
    count: number | null;
    title: string | null;
    dateTime: string | null;
    error: string | null;
  };
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

export default function RsvpReportPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [report, setReport] = useState<RsvpReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [csvAttendees, setCsvAttendees] = useState<CsvAttendee[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvParseWarning, setCsvParseWarning] = useState<string | null>(null);
  const [manualEstimate, setManualEstimate] = useState<number>(0);

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/posts/${slug}/rsvps`);
        if (!response.ok) {
          throw new Error("Failed to load RSVP report");
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError("Failed to load RSVP report.");
        console.error("Error loading RSVP report:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchReport();
    }
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

  const sheetCount = report?.sheet.rows.length ?? 0;
  const csvCount = csvAttendees.length;
  const total = sheetCount + csvCount + manualEstimate;

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
          RSVP Report{report?.postTitle ? `: ${report.postTitle}` : ""}
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Combines RSVPs from the site&apos;s Google Sheet, an uploaded Meetup
          guest-list CSV, and a manual walk-in estimate. Nothing on this page is
          saved - re-open it fresh each time you need the number.
        </p>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-etsa-primary mx-auto"></div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Google Sheet
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {sheetCount}
              </p>
              {report.sheet.error && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {report.sheet.error}
                </p>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Meetup (count only)
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {report.meetup.count ?? "—"}
              </p>
              {report.meetup.error && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {report.meetup.error}
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
                Download this from the event&apos;s organizer dashboard on
                meetup.com. Parsed in your browser only - nothing is sent
                anywhere.
              </p>
              <input
                id="csvUpload"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="mt-2 block w-full text-sm text-gray-700 dark:text-gray-300"
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
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {report.sheet.rows.map((row, idx) => (
                  <tr key={`sheet-${idx}`}>
                    <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      Google Sheet
                    </td>
                  </tr>
                ))}
                {csvAttendees.map((attendee, idx) => (
                  <tr key={`csv-${idx}`}>
                    <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                      {attendee.name}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      Meetup (CSV export)
                    </td>
                  </tr>
                ))}
                {manualEstimate > 0 && (
                  <tr>
                    <td className="px-6 py-3 text-sm text-gray-900 dark:text-white italic">
                      {manualEstimate} estimated walk-in
                      {manualEstimate === 1 ? "" : "s"}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      Manual estimate
                    </td>
                  </tr>
                )}
                {sheetCount === 0 && csvCount === 0 && manualEstimate === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-6 text-sm text-center text-gray-500 dark:text-gray-400"
                    >
                      No RSVPs yet from any source.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Note: someone who RSVP&apos;d both on etsa.tech and on Meetup will
            appear in both sources and be counted twice - this report
            doesn&apos;t attempt to de-duplicate across sources.
          </p>
        </>
      )}
    </div>
  );
}
