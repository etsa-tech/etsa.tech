"use client";

import { useState } from "react";
import {
  AttendanceFormat,
  AttendanceRecord,
  AttendanceRecordInput,
} from "@/types/attendance";

interface AttendanceBulkImportProps {
  // Records already on file - used to detect that a pasted row's post
  // already has an attendance record, so the row updates it instead of
  // creating a duplicate.
  readonly existingRecords: AttendanceRecord[];
  readonly onImportRow: (
    input: AttendanceRecordInput,
    existingId?: string,
  ) => Promise<void>;
  readonly onComplete: () => void;
}

const VALID_FORMATS: Set<AttendanceFormat> = new Set([
  "in-person",
  "virtual",
  "hybrid",
]);

export function parseBulkImportLine(
  line: string,
): AttendanceRecordInput | null {
  const parts = line.split(",").map((part) => part.trim());
  if (parts.length < 5) return null;

  // Notes is optional and last - rejoin any remaining parts so a comma
  // inside the note itself doesn't get treated as a new field.
  const [eventDate, postSlug, format, inPersonRaw, virtualRaw, ...noteParts] =
    parts;
  const inPersonCount = Number(inPersonRaw);
  const virtualCount = Number(virtualRaw);
  const notes = noteParts.join(", ").trim();

  if (
    !eventDate ||
    !postSlug ||
    !VALID_FORMATS.has(format as AttendanceFormat) ||
    Number.isNaN(inPersonCount) ||
    Number.isNaN(virtualCount)
  ) {
    return null;
  }

  return {
    eventDate,
    postSlug,
    eventTitle: postSlug,
    format: format as AttendanceFormat,
    inPersonCount,
    virtualCount,
    ...(notes ? { notes } : {}),
  };
}

export default function AttendanceBulkImport({
  existingRecords,
  onImportRow,
  onComplete,
}: AttendanceBulkImportProps) {
  const [csv, setCsv] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    succeeded: number;
    failed: number;
  } | null>(null);

  const handleImport = async () => {
    const lines = csv
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const parsedRows = lines.map(parseBulkImportLine);
    const invalidCount = parsedRows.filter((row) => row === null).length;

    // Dedupe by postSlug within this paste - last occurrence wins - so a
    // pasted CSV that lists the same event twice can't create two records
    // for it in one run.
    const rowsBySlug = new Map<string, AttendanceRecordInput>();
    for (const row of parsedRows) {
      if (row) rowsBySlug.set(row.postSlug, row);
    }
    const rows = [...rowsBySlug.values()];

    setIsImporting(true);
    setResult(null);

    const outcomes = await Promise.all(
      rows.map(async (row) => {
        try {
          const existingId = existingRecords.find(
            (record) => record.postSlug === row.postSlug,
          )?.id;
          await onImportRow(row, existingId);
          return true;
        } catch {
          return false;
        }
      }),
    );

    setIsImporting(false);
    setResult({
      succeeded: outcomes.filter(Boolean).length,
      failed: outcomes.filter((ok) => !ok).length + invalidCount,
    });
    onComplete();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        One row per line:{" "}
        <code>date,postSlug,format,inPersonCount,virtualCount,notes</code>{" "}
        (format is <code>in-person</code>, <code>virtual</code>, or{" "}
        <code>hybrid</code>; notes is optional). A row whose post already has a
        record updates it instead of creating a duplicate.
      </p>
      <textarea
        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
        rows={6}
        value={csv}
        onChange={(event) => setCsv(event.target.value)}
        placeholder="2024-07-02,2024-07-02-july-social,hybrid,12,4,In person social"
      />
      <button
        type="button"
        disabled={isImporting || !csv.trim()}
        onClick={handleImport}
        className="rounded-md bg-etsa-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-etsa-primary-dark disabled:opacity-50"
      >
        {isImporting ? "Importing..." : "Import rows"}
      </button>
      {result && (
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Imported {result.succeeded} row(s){" "}
          {result.failed > 0 && `- ${result.failed} failed`}
        </p>
      )}
    </div>
  );
}
