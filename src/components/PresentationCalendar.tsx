"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PostSummary } from "@/types/post";
import { getPostUrl } from "@/lib/utils";

interface PresentationCalendarProps {
  posts: PostSummary[];
}

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Validates and normalises a frontmatter date string.
 *  Returns "YYYY-MM-DD" or null if invalid. */
function normaliseDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  // Accept YYYY-MM-DD (with optional time suffix)
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (isNaN(date.getTime())) return null;
  return `${y}-${m}-${d}`;
}

export function PresentationCalendar({
  posts,
}: Readonly<PresentationCalendarProps>) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  /** Date string ("YYYY-MM-DD") of the day whose multi-event list is open */
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Build a map of "YYYY-MM-DD" -> posts[]
  const eventsByDate: Record<string, PostSummary[]> = {};
  for (const post of posts) {
    const dateStr = normaliseDate(post.frontmatter.date);
    if (dateStr) {
      if (!eventsByDate[dateStr]) {
        eventsByDate[dateStr] = [];
      }
      eventsByDate[dateStr].push(post);
    }
  }

  // Close the popover when clicking outside it
  const handleDocClick = useCallback(
    (e: MouseEvent) => {
      if (
        openPopover &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpenPopover(null);
      }
    },
    [openPopover],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [handleDocClick]);

  // Close popover on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPopover(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const goToPrevMonth = () => {
    setOpenPopover(null);
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    setOpenPopover(null);
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setOpenPopover(null);
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  // Build calendar grid: leading empty cells + day numbers
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  // Events in the current month, sorted chronologically
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const eventsThisMonth = Object.entries(eventsByDate)
    .filter(([date]) => date.startsWith(monthPrefix))
    .sort(([a], [b]) => a.localeCompare(b));

  const popoverEvents = openPopover ? eventsByDate[openPopover] ?? [] : [];
  const popoverDateLabel = openPopover
    ? (() => {
        const [, , d] = openPopover.split("-");
        return `${MONTH_NAMES[month]} ${parseInt(d)}, ${year}`;
      })()
    : "";

  return (
    <div className="card">
      {/* ── Header ── */}
      <div className="card-header pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors shrink-0"
            aria-label="Previous month"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm text-center">
            {MONTH_NAMES[month]} {year}
          </h3>

          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors shrink-0"
            aria-label="Next month"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {!isCurrentMonth && (
          <button
            onClick={goToToday}
            className="mt-1.5 w-full text-xs text-etsa-primary hover:text-etsa-secondary transition-colors"
          >
            Back to today
          </button>
        )}
      </div>

      {/* ── Calendar grid ── */}
      <div className="px-4 pb-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} aria-hidden="true" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(
              2,
              "0",
            )}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsByDate[dateStr] ?? [];
            const isToday = dateStr === todayStr;

            if (dayEvents.length === 1) {
              // Single event → direct link
              return (
                <Link
                  key={dateStr}
                  href={getPostUrl(dayEvents[0].slug, dayEvents[0].frontmatter)}
                  title={dayEvents[0].frontmatter.title}
                  className={`flex items-center justify-center rounded-full w-7 h-7 mx-auto text-xs font-semibold transition-colors ${
                    isToday
                      ? "bg-etsa-primary text-white ring-2 ring-offset-1 ring-etsa-primary hover:bg-etsa-secondary"
                      : "bg-etsa-primary text-white hover:bg-etsa-secondary"
                  }`}
                >
                  {day}
                </Link>
              );
            }

            if (dayEvents.length > 1) {
              // Multiple events → button opens inline list
              const isOpen = openPopover === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setOpenPopover(isOpen ? null : dateStr)}
                  title={`${dayEvents.length} presentations`}
                  aria-expanded={isOpen}
                  aria-haspopup="listbox"
                  className={`relative flex items-center justify-center rounded-full w-7 h-7 mx-auto text-xs font-semibold transition-colors ${
                    isOpen
                      ? "bg-etsa-secondary text-white"
                      : "bg-etsa-primary text-white hover:bg-etsa-secondary"
                  }`}
                >
                  {day}
                  {/* Multi-event dot indicator */}
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-accent-500 rounded-full border border-white dark:border-gray-800" />
                </button>
              );
            }

            // No event
            return (
              <div
                key={dateStr}
                className={`flex items-center justify-center rounded-full w-7 h-7 mx-auto text-xs ${
                  isToday
                    ? "ring-2 ring-etsa-primary font-semibold text-etsa-primary"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* ── Multi-event popover ── */}
        {openPopover && (
          <div
            ref={popoverRef}
            role="listbox"
            aria-label={`Presentations on ${popoverDateLabel}`}
            className="mt-3 rounded-lg border border-etsa-primary/30 bg-primary-50 dark:bg-gray-750 dark:bg-gray-700 shadow-sm overflow-hidden"
          >
            <p className="px-3 py-2 text-xs font-semibold text-etsa-primary border-b border-etsa-primary/20">
              {popoverEvents.length} presentations on {popoverDateLabel}
            </p>
            <ul className="divide-y divide-gray-100 dark:divide-gray-600">
              {popoverEvents.map((post) => (
                <li key={post.slug} role="option" aria-selected="false">
                  <Link
                    href={getPostUrl(post.slug, post.frontmatter)}
                    onClick={() => setOpenPopover(null)}
                    className="flex items-start gap-2 px-3 py-2.5 hover:bg-primary-100 dark:hover:bg-gray-600 transition-colors group"
                  >
                    <svg
                      className="mt-0.5 w-3.5 h-3.5 shrink-0 text-etsa-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="text-xs text-gray-800 dark:text-gray-200 group-hover:text-etsa-primary transition-colors line-clamp-2">
                      {post.frontmatter.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Events this month list ── */}
        {eventsThisMonth.length > 0 ? (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
            {eventsThisMonth.map(([date, dayEvents]) => {
              const [, , dayNum] = date.split("-");
              return dayEvents.map((post) => (
                <Link
                  key={`${date}-${post.slug}`}
                  href={getPostUrl(post.slug, post.frontmatter)}
                  className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors group"
                >
                  <span className="shrink-0 w-5 h-5 rounded-full bg-etsa-primary/10 text-etsa-primary font-semibold flex items-center justify-center text-[10px] leading-none">
                    {parseInt(dayNum)}
                  </span>
                  <span className="group-hover:underline line-clamp-2 leading-snug">
                    {post.frontmatter.title}
                  </span>
                </Link>
              ));
            })}
          </div>
        ) : (
          <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
            No events this month
          </p>
        )}
      </div>
    </div>
  );
}
