"use client";

import { useState } from "react";
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

export function PresentationCalendar({
  posts,
}: Readonly<PresentationCalendarProps>) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  // Build a map of "YYYY-MM-DD" -> posts[]
  const eventsByDate: Record<string, PostSummary[]> = {};
  for (const post of posts) {
    const dateStr = post.frontmatter.date;
    if (dateStr) {
      if (!eventsByDate[dateStr]) {
        eventsByDate[dateStr] = [];
      }
      eventsByDate[dateStr].push(post);
    }
  }

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
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

  // Count events in this month for the legend
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const eventsThisMonth = Object.entries(eventsByDate).filter(([date]) =>
    date.startsWith(monthPrefix),
  );

  return (
    <div className="card">
      <div className="card-header pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
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

          <div className="text-center">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {MONTH_NAMES[month]} {year}
            </h3>
          </div>

          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
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
            className="mt-2 w-full text-xs text-etsa-primary hover:text-etsa-secondary transition-colors"
          >
            Back to today
          </button>
        )}
      </div>

      <div className="card-content pt-0 px-4 pb-4">
        {/* Day headers */}
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

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(
              2,
              "0",
            )}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsByDate[dateStr] ?? [];
            const hasEvents = dayEvents.length > 0;
            const isToday = dateStr === todayStr;

            if (hasEvents) {
              const firstEvent = dayEvents[0];
              const extraCount = dayEvents.length - 1;
              return (
                <Link
                  key={dateStr}
                  href={getPostUrl(firstEvent.slug, firstEvent.frontmatter)}
                  title={dayEvents.map((e) => e.frontmatter.title).join("\n")}
                  className="relative flex items-center justify-center rounded-full w-7 h-7 mx-auto text-xs font-semibold bg-etsa-primary text-white hover:bg-etsa-secondary transition-colors"
                >
                  {day}
                  {extraCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                      {extraCount > 9 ? "9+" : `+${extraCount}`}
                    </span>
                  )}
                </Link>
              );
            }

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

        {/* Events this month */}
        {eventsThisMonth.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
            {eventsThisMonth
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dayEvents]) => {
                const [, , dayNum] = date.split("-");
                return dayEvents.map((post) => (
                  <Link
                    key={`${date}-${post.slug}`}
                    href={getPostUrl(post.slug, post.frontmatter)}
                    className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors group"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-etsa-primary/10 text-etsa-primary font-semibold flex items-center justify-center text-[10px]">
                      {parseInt(dayNum)}
                    </span>
                    <span className="group-hover:underline line-clamp-1">
                      {post.frontmatter.title}
                    </span>
                  </Link>
                ));
              })}
          </div>
        )}

        {eventsThisMonth.length === 0 && (
          <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
            No events this month
          </p>
        )}
      </div>
    </div>
  );
}
