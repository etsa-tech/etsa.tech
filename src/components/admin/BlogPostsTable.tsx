"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";

interface BlogPost {
  name: string;
  path: string;
  size: number;
  frontmatter?: {
    title: string;
    date: string;
    speakerName?: string;
    speakerImage?: string;
    published?: boolean;
    blogpost?: boolean;
    speakers?: Array<{
      name: string;
      image?: string;
    }>;
  };
}

interface BlogPostsTableProps {
  readonly posts: BlogPost[];
  readonly isLoading?: boolean;
}

type SortField = "name" | "date" | "speaker";
type SortDirection = "asc" | "desc";

interface SortIconProps {
  readonly field: SortField;
  readonly currentSortField: SortField;
  readonly sortDirection: SortDirection;
}

function SortIcon({
  field,
  currentSortField,
  sortDirection,
}: Readonly<SortIconProps>) {
  if (currentSortField !== field) {
    return <span className="text-gray-400">↕️</span>;
  }
  return (
    <span className="text-etsa-primary">
      {sortDirection === "asc" ? "↑" : "↓"}
    </span>
  );
}

function ActionIcon({ path }: Readonly<{ path: string }>) {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function PostActions({
  slug,
  title,
  isPresentation,
}: Readonly<{ slug: string; title: string; isPresentation: boolean }>) {
  return (
    <div className="flex items-center space-x-3">
      <Link
        href={`/presentation/${slug}`}
        target="_blank"
        title="View"
        aria-label={`View ${title}`}
        className="text-etsa-primary hover:text-etsa-primary-dark"
      >
        <ActionIcon path={ICON_PATHS.view} />
      </Link>
      <Link
        href={`/admin/posts/${slug}/edit`}
        title="Edit"
        aria-label={`Edit ${title}`}
        className="text-etsa-primary hover:text-etsa-primary-dark"
      >
        <ActionIcon path={ICON_PATHS.edit} />
      </Link>
      <Link
        href={`/admin/posts/${slug}/rsvps`}
        title="RSVPs"
        aria-label={`RSVPs for ${title}`}
        className="text-etsa-primary hover:text-etsa-primary-dark"
      >
        <ActionIcon path={ICON_PATHS.rsvps} />
      </Link>
      {isPresentation && (
        <Link
          href={`/admin/posts/${slug}/social`}
          title="Social"
          aria-label={`Social mailing for ${title}`}
          className="text-etsa-primary hover:text-etsa-primary-dark"
        >
          <ActionIcon path={ICON_PATHS.social} />
        </Link>
      )}
    </div>
  );
}

const ICON_PATHS = {
  view: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  edit: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z M19.5 15v3.75A2.25 2.25 0 0117.25 21H5.25A2.25 2.25 0 013 18.75V6.75A2.25 2.25 0 015.25 4.5h3.75",
  rsvps:
    "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  social:
    "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46",
} as const;

export default function BlogPostsTable({
  posts,
  isLoading,
}: Readonly<BlogPostsTableProps>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter] = useState<"all" | "published" | "draft">("all");

  // Parse posts and extract data
  const parsedPosts = useMemo(() => {
    return posts.map((post) => {
      const slug = post.name.replace(".md", "");

      // Extract date from filename (format: YYYY-MM-DD-title)
      const dateRegex = /^(\d{4}-\d{2}-\d{2})/;
      const dateMatch = dateRegex.exec(slug);
      const extractedDate = dateMatch ? dateMatch[1] : "";

      // Get title from slug (remove date prefix)
      const title = slug.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");

      // Get speaker info
      const speakerImage =
        post.frontmatter?.speakerImage ||
        post.frontmatter?.speakers?.[0]?.image;
      const speakerName =
        post.frontmatter?.speakerName ||
        post.frontmatter?.speakers?.[0]?.name ||
        "Unknown Speaker";

      return {
        slug,
        title,
        date: extractedDate,
        speakerName,
        speakerImage,
        size: post.size,
        originalPost: post,
      };
    });
  }, [posts]);

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    const filtered = parsedPosts.filter((post) => {
      // Text search filter
      const matchesSearch =
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.speakerName.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" &&
          post.originalPost.frontmatter?.published !== false) ||
        (statusFilter === "draft" &&
          post.originalPost.frontmatter?.published === false);

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortField === "date") {
        aValue = a.date;
        bValue = b.date;
      } else if (sortField === "speaker") {
        aValue = a.speakerName.toLowerCase();
        bValue = b.speakerName.toLowerCase();
      } else {
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [parsedPosts, searchTerm, sortField, sortDirection, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPosts = filteredAndSortedPosts.slice(startIndex, endIndex);

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
      {/* Search Bar and Controls */}
      <div className="px-4 py-5 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="max-w-md">
            <label htmlFor="search" className="sr-only">
              Search posts
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
                id="search"
                type="text"
                placeholder="Search posts or speakers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-etsa-primary focus:border-etsa-primary sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label
                htmlFor="pageSize"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Show:
              </label>
              <select
                id="pageSize"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-etsa-primary focus:border-etsa-primary"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                per page
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile card list - avoids the sideways scroll a wide table would
          need on small screens */}
      <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {currentPosts.map((post) => (
          <div key={post.slug} className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10">
                {post.speakerImage ? (
                  <Image
                    className="h-10 w-10 rounded-full object-cover"
                    src={post.speakerImage}
                    alt={post.speakerName}
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-etsa-primary flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {post.speakerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {post.speakerName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {post.title}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {post.date ? formatDate(post.date) : "No date"}
              </span>
              <PostActions
                slug={post.slug}
                title={post.title}
                isPresentation={
                  post.originalPost.frontmatter?.blogpost !== true
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort("speaker")}
              >
                <div className="flex items-center space-x-1">
                  <span>Speaker</span>
                  <SortIcon
                    field="speaker"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center space-x-1">
                  <span>Post Name</span>
                  <SortIcon
                    field="name"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  <SortIcon
                    field="date"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {currentPosts.map((post) => (
              <tr
                key={post.slug}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      {post.speakerImage ? (
                        <Image
                          className="h-12 w-12 rounded-full object-cover"
                          src={post.speakerImage}
                          alt={post.speakerName}
                          width={48}
                          height={48}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-etsa-primary flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {post.speakerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {post.speakerName}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {post.title}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {(post.size / 1024).toFixed(1)} KB
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {post.date ? formatDate(post.date) : "No date"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <PostActions
                    slug={post.slug}
                    title={post.title}
                    isPresentation={
                      post.originalPost.frontmatter?.blogpost !== true
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(endIndex, filteredAndSortedPosts.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {filteredAndSortedPosts.length}
                </span>{" "}
                results
              </p>
            </div>
            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? "z-10 bg-etsa-primary border-etsa-primary text-white"
                              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span
                          key={page}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  },
                )}

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {filteredAndSortedPosts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <span className="text-4xl">📝</span>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {searchTerm ? "No posts found" : "No blog posts"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm
              ? `No posts match "${searchTerm}". Try a different search term.`
              : "Get started by creating a new blog post."}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <Link
                href="/admin/posts/new"
                className="inline-flex items-center rounded-md bg-etsa-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-etsa-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-etsa-primary"
              >
                Create New Post
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
