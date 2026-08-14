"use client";

import { useState } from "react";
import {
  AttendanceRecord,
  AttendanceStats as AttendanceStatsData,
} from "@/types/attendance";
import { YearAttendanceBreakdown } from "./YearAttendanceBreakdown";

interface AttendanceStatsProps {
  readonly stats: AttendanceStatsData;
  // Admin-only: when provided, yearly rows become clickable and expand a
  // per-event stacked bar chart. Omitted on the public /attendance page,
  // which deliberately never receives raw per-event records.
  readonly records?: AttendanceRecord[];
}

// Shared by the admin attendance page and the public /attendance page, so
// the aggregate presentation stays identical between the two surfaces.
export function AttendanceStats({ stats, records }: AttendanceStatsProps) {
  const { overall, yearly } = stats;
  const maxYearlyTotal = Math.max(1, ...yearly.map((year) => year.avgTotal));
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Events tracked" value={overall.totalEvents} />
        <StatCard label="Avg. attendance" value={overall.avgTotal} />
        <StatCard label="Avg. in-person" value={overall.avgInPerson} />
        <StatCard label="Avg. virtual" value={overall.avgVirtual} />
      </div>

      {yearly.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-lg">Yearly attendance trend</h3>
          </div>
          <div className="card-content space-y-3">
            {yearly.map((year) => {
              const isExpanded = expandedYear === year.year;
              const row = (
                <div className="flex flex-1 items-center space-x-3">
                  <span className="w-12 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {year.year}
                  </span>
                  <div className="h-4 flex-1 rounded bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-4 rounded bg-etsa-primary"
                      style={{
                        width: `${(year.avgTotal / maxYearlyTotal) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm text-gray-600 dark:text-gray-400">
                    avg {year.avgTotal}
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
                    {year.eventCount} events
                  </span>
                </div>
              );

              return (
                <div key={year.year}>
                  {records ? (
                    <button
                      type="button"
                      className="flex w-full items-center rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-etsa-primary"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedYear(isExpanded ? null : year.year)
                      }
                    >
                      {row}
                    </button>
                  ) : (
                    row
                  )}
                  {records && isExpanded && (
                    <div className="mt-3">
                      <YearAttendanceBreakdown
                        year={year.year}
                        records={records}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow p-5">
      <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}
