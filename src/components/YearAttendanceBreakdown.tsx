import { AttendanceRecord } from "@/types/attendance";

interface YearAttendanceBreakdownProps {
  readonly year: number;
  readonly records: AttendanceRecord[];
  // Optional: outlines the matching bar, for callers showing this chart in
  // the context of one specific event (e.g. the per-post attendance page).
  readonly highlightId?: string;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const BAR_HEIGHT_PX = 110;

// Per-event stacked bar breakdown for a single year - admin-only drill-down
// from AttendanceStats' yearly trend, since it exposes raw per-event
// numbers the public /attendance page deliberately never shows.
export function YearAttendanceBreakdown({
  year,
  records,
  highlightId,
}: YearAttendanceBreakdownProps) {
  const yearRecords = records
    .filter((record) => Number(record.eventDate.slice(0, 4)) === year)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  if (yearRecords.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No events recorded for {year}.
      </p>
    );
  }

  const maxTotal = Math.max(
    1,
    ...yearRecords.map((record) => record.inPersonCount + record.virtualCount),
  );

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
        <Legend swatchClassName="bg-etsa-primary" label="In-person" />
        <Legend
          swatchClassName="bg-[#eb6834] dark:bg-[#d95926]"
          label="Virtual"
        />
      </div>
      <div className="flex items-end space-x-0.5">
        {yearRecords.map((record) => {
          const total = record.inPersonCount + record.virtualCount;
          const inPersonPct = (record.inPersonCount / maxTotal) * 100;
          const virtualPct = (record.virtualCount / maxTotal) * 100;
          const month =
            MONTH_LABELS[Number(record.eventDate.slice(5, 7)) - 1] ?? "";
          const isHighlighted = record.id === highlightId;

          return (
            <button
              key={record.id}
              type="button"
              className="group relative flex flex-1 flex-col items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-etsa-primary"
              aria-label={`${record.eventTitle}, ${record.eventDate}: ${
                record.inPersonCount
              } in-person, ${record.virtualCount} virtual, ${total} total${
                isHighlighted ? " (this event)" : ""
              }`}
            >
              <div
                className={`flex w-full max-w-[24px] flex-col-reverse overflow-hidden rounded-t-sm bg-gray-100 dark:bg-gray-700 ${
                  isHighlighted
                    ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-900"
                    : ""
                }`}
                style={{ height: BAR_HEIGHT_PX }}
              >
                <div
                  className="w-full bg-etsa-primary"
                  style={{ height: `${inPersonPct}%` }}
                />
                {record.virtualCount > 0 && (
                  <div
                    className="w-full bg-[#eb6834] dark:bg-[#d95926]"
                    style={{ height: `${virtualPct}%` }}
                  />
                )}
              </div>
              <span
                className={`mt-1 text-[10px] ${
                  isHighlighted
                    ? "font-semibold text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {month}
              </span>

              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1.5 text-left text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100 dark:bg-gray-700">
                <p className="font-semibold">{record.eventTitle}</p>
                <p className="text-gray-300 dark:text-gray-300">
                  {record.eventDate}
                </p>
                <p>
                  <span className="font-semibold">{record.inPersonCount}</span>{" "}
                  in-person &middot;{" "}
                  <span className="font-semibold">{record.virtualCount}</span>{" "}
                  virtual
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({
  swatchClassName,
  label,
}: {
  readonly swatchClassName: string;
  readonly label: string;
}) {
  return (
    <span className="flex items-center space-x-1.5">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-sm ${swatchClassName}`}
      />
      <span>{label}</span>
    </span>
  );
}
