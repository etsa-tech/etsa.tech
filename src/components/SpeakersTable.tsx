"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { getSpeakerUrl } from "@/lib/utils";
import type { Speaker, PostSummary } from "@/types/post";

interface SpeakerData {
  name: string;
  speaker: Speaker;
  talkCount: number;
  latestTalk: PostSummary | null;
  allTalks: PostSummary[];
  totalViews?: number;
  averageRating?: number;
}

interface SpeakersTableProps {
  speakers: SpeakerData[];
}

type SortField = "name" | "talkCount" | "latestTalk" | "company" | "totalViews";
type SortDirection = "asc" | "desc";

export function SpeakersTable({ speakers }: Readonly<SpeakersTableProps>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("talkCount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");

  // Filter and sort speakers
  const filteredAndSortedSpeakers = useMemo(() => {
    const filtered = speakers.filter((speakerData) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        speakerData.name.toLowerCase().includes(searchLower) ||
        speakerData.speaker.title?.toLowerCase().includes(searchLower) ||
        speakerData.speaker.company?.toLowerCase().includes(searchLower) ||
        speakerData.speaker.bio?.toLowerCase().includes(searchLower) ||
        speakerData.latestTalk?.frontmatter.title
          .toLowerCase()
          .includes(searchLower)
      );
    });

    // Sort speakers
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "talkCount":
          aValue = a.talkCount;
          bValue = b.talkCount;
          break;
        case "latestTalk":
          aValue = a.latestTalk?.frontmatter.date || "1900-01-01";
          bValue = b.latestTalk?.frontmatter.date || "1900-01-01";
          break;
        case "company":
          aValue = a.speaker.company || "";
          bValue = b.speaker.company || "";
          break;
        case "totalViews":
          aValue = a.totalViews || 0;
          bValue = b.totalViews || 0;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [speakers, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    return sortDirection === "asc" ? (
      <svg
        className="w-4 h-4 text-etsa-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-etsa-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search speakers or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              View:
            </span>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-etsa-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
              title="Grid view"
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
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-etsa-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
              title="Table view"
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
                  d="M3 10h18M3 6h18m-9 8h9"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredAndSortedSpeakers.length} of {speakers.length}{" "}
          speakers
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Speaker</span>
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort("company")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Company</span>
                    <SortIcon field="company" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort("talkCount")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Talks</span>
                    <SortIcon field="talkCount" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort("latestTalk")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Latest Talk</span>
                    <SortIcon field="latestTalk" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedSpeakers.map((speakerData) => (
                <SpeakerTableRow
                  key={speakerData.name}
                  speakerData={speakerData}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredAndSortedSpeakers.map((speakerData) => (
            <SpeakerCard key={speakerData.name} speakerData={speakerData} />
          ))}
        </div>
      )}

      {filteredAndSortedSpeakers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No speakers found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search terms or clearing the search to see all
            speakers.
          </p>
        </div>
      )}
    </div>
  );
}

function SpeakerTableRow({
  speakerData,
}: Readonly<{ speakerData: SpeakerData }>) {
  const { name, speaker, talkCount, latestTalk } = speakerData;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-12 w-12">
            {speaker.image ? (
              <Image
                src={speaker.image}
                alt={name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-etsa-primary flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <Link
              href={getSpeakerUrl(name)}
              className="text-sm font-medium text-gray-900 dark:text-white hover:text-etsa-primary transition-colors"
            >
              {name}
            </Link>
            {speaker.title && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {speaker.title}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white">
          {speaker.company || "—"}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-etsa-primary text-white">
            {talkCount}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {latestTalk ? (
          <div>
            <Link
              href={`/presentation/${latestTalk.slug}`}
              className="text-sm font-medium text-gray-900 dark:text-white hover:text-etsa-primary transition-colors line-clamp-1"
            >
              {latestTalk.frontmatter.title}
            </Link>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(latestTalk.frontmatter.date)}
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Link
          href={getSpeakerUrl(name)}
          className="text-etsa-primary hover:text-etsa-primary-dark transition-colors"
        >
          View Profile
        </Link>
      </td>
    </tr>
  );
}

function SpeakerCard({ speakerData }: Readonly<{ speakerData: SpeakerData }>) {
  const { name, speaker, talkCount, latestTalk } = speakerData;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="p-6 flex-1 flex flex-col">
        {/* Speaker Info - Fixed Height Section */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-shrink-0">
            {speaker.image ? (
              <Image
                src={speaker.image}
                alt={name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-etsa-primary flex items-center justify-center">
                <span className="text-white font-semibold text-xl">
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={getSpeakerUrl(name)}
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-etsa-primary transition-colors block"
            >
              {name}
            </Link>
            <div className="h-8 flex flex-col justify-start">
              {speaker.title && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {speaker.title}
                </p>
              )}
              {speaker.company && (
                <p className="text-sm text-gray-500 dark:text-gray-500 truncate">
                  {speaker.company}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Talk Count - Fixed Height Section */}
        <div className="flex items-center justify-center mb-4 py-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-etsa-primary">
              {talkCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Talk{talkCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Latest Talk - Flexible Height Section */}
        <div className="flex-1 flex flex-col">
          {latestTalk ? (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex-1 flex flex-col">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Latest Talk:
              </h4>
              <div className="flex-1 flex flex-col justify-between">
                <Link
                  href={`/presentation/${latestTalk.slug}`}
                  className="text-sm text-etsa-primary hover:text-etsa-primary-dark transition-colors line-clamp-3 mb-2"
                  title={latestTalk.frontmatter.title}
                >
                  {latestTalk.frontmatter.title}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(latestTalk.frontmatter.date)}
                </p>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No presentations yet
              </p>
            </div>
          )}
        </div>

        {/* Action Button - Fixed Height Section */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href={getSpeakerUrl(name)}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-etsa-primary hover:bg-etsa-primary-dark transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
