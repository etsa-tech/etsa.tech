"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AttendanceFormat, SpeakerAttendanceStats } from "@/types/attendance";
import { SortIcon, SortDirection } from "@/components/admin/SortIcon";
import { SpeakerLink } from "@/components/SpeakerLink";

async function parseJsonError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return "Request failed";
  }
}

type SortField =
  | "speaker"
  | "events"
  | "avgTotal"
  | "avgInPerson"
  | "avgVirtual";

const sortValue: Record<
  SortField,
  (speaker: SpeakerAttendanceStats) => string | number
> = {
  speaker: (speaker) => speaker.speakerName.toLowerCase(),
  events: (speaker) => speaker.eventCount,
  avgTotal: (speaker) => speaker.avgTotal,
  avgInPerson: (speaker) => speaker.avgInPerson,
  avgVirtual: (speaker) => speaker.avgVirtual,
};

const columns: { field: SortField; label: string }[] = [
  { field: "speaker", label: "Speaker" },
  { field: "events", label: "Events" },
  { field: "avgTotal", label: "Avg. total" },
  { field: "avgInPerson", label: "Avg. in-person" },
  { field: "avgVirtual", label: "Avg. virtual" },
];

const formatLabels: Record<AttendanceFormat, string> = {
  "in-person": "In-person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

export default function AttendanceBySpeakerPage() {
  const [speakers, setSpeakers] = useState<SpeakerAttendanceStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("avgTotal");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedSpeakers, setExpandedSpeakers] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/attendance/speakers");
        if (!response.ok) throw new Error(await parseJsonError(response));
        const data = await response.json();
        setSpeakers(data.speakers || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load speakers",
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const toggleSpeaker = (speakerName: string) => {
    setExpandedSpeakers((prev) => {
      const next = new Set(prev);
      if (next.has(speakerName)) {
        next.delete(speakerName);
      } else {
        next.add(speakerName);
      }
      return next;
    });
  };

  const visibleSpeakers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? speakers.filter((speaker) =>
          speaker.speakerName.toLowerCase().includes(term),
        )
      : speakers;

    const getValue = sortValue[sortField];
    return [...filtered].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [speakers, searchTerm, sortField, sortDirection]);

  let cardContent: React.ReactNode;
  if (isLoading) {
    cardContent = (
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    );
  } else if (speakers.length === 0) {
    cardContent = (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No speaker attendance data yet.
      </p>
    );
  } else {
    cardContent = (
      <>
        <div className="max-w-xs">
          <label htmlFor="speaker-search" className="sr-only">
            Search speakers
          </label>
          <input
            id="speaker-search"
            type="text"
            placeholder="Search speakers..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
          />
        </div>

        {visibleSpeakers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No speakers match your search.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  <th className="w-8 py-2 pr-2">
                    <span className="sr-only">Expand</span>
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.field}
                      className="py-2 pr-4 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => handleSort(column.field)}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.label}</span>
                        <SortIcon
                          field={column.field}
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-900 dark:text-white">
                {visibleSpeakers.map((speaker) => {
                  const isExpanded = expandedSpeakers.has(speaker.speakerName);
                  return (
                    <SpeakerRows
                      key={speaker.speakerName}
                      speaker={speaker}
                      isExpanded={isExpanded}
                      onToggle={() => toggleSpeaker(speaker.speakerName)}
                      columnCount={columns.length + 1}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/attendance"
          className="text-sm text-etsa-primary hover:underline"
        >
          ← Back to attendance
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Attendance by Speaker
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Average and total attendance across every event a speaker has
          presented. Events with no speaker on file (e.g. socials) aren&apos;t
          included. Expand a speaker to see the individual talks behind their
          numbers.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="card">
        <div className="card-content space-y-3">{cardContent}</div>
      </div>
    </div>
  );
}

function SpeakerRows({
  speaker,
  isExpanded,
  onToggle,
  columnCount,
}: {
  readonly speaker: SpeakerAttendanceStats;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly columnCount: number;
}) {
  return (
    <>
      <tr>
        <td className="py-2 pr-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${
              speaker.speakerName
            }'s talks`}
            className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {isExpanded ? "−" : "+"}
          </button>
        </td>
        <td className="py-2 pr-4">
          <SpeakerLink
            speakerName={speaker.speakerName}
            className="text-etsa-primary hover:underline"
          />
        </td>
        <td className="py-2 pr-4">{speaker.eventCount}</td>
        <td className="py-2 pr-4">{speaker.avgTotal}</td>
        <td className="py-2 pr-4">{speaker.avgInPerson}</td>
        <td className="py-2 pr-4">{speaker.avgVirtual}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td
            colSpan={columnCount}
            className="bg-gray-50 p-3 dark:bg-gray-900/40"
          >
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left font-medium uppercase text-gray-500 dark:text-gray-400">
                  <th className="py-1 pr-4">Date</th>
                  <th className="py-1 pr-4">Event</th>
                  <th className="py-1 pr-4">Format</th>
                  <th className="py-1 pr-4">In-person</th>
                  <th className="py-1 pr-4">Virtual</th>
                  <th className="py-1 pr-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {speaker.records.map((record) => (
                  <tr key={record.id}>
                    <td className="py-1 pr-4">{record.eventDate}</td>
                    <td className="py-1 pr-4">
                      <Link
                        href={`/admin/posts/${record.postSlug}/attendance`}
                        className="text-etsa-primary hover:underline"
                      >
                        {record.eventTitle}
                      </Link>
                    </td>
                    <td className="py-1 pr-4">{formatLabels[record.format]}</td>
                    <td className="py-1 pr-4">{record.inPersonCount}</td>
                    <td className="py-1 pr-4">{record.virtualCount}</td>
                    <td className="py-1 pr-4">
                      {record.inPersonCount + record.virtualCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
