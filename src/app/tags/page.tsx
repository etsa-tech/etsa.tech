import { Metadata } from "next";
import Link from "next/link";
import { getTagsWithCount } from "@/lib/blog";
import { getTagUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "All Tags - ETSA",
  description:
    "Browse all presentation topics and technologies covered by ETSA speakers.",
  openGraph: {
    title: "All Tags - ETSA",
    description:
      "Browse all presentation topics and technologies covered by ETSA speakers.",
  },
};

export default function TagsPage() {
  const tagsWithCount = getTagsWithCount();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            All Tags
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Browse all topics and technologies covered in ETSA presentations.
            Click any tag to see related presentations.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center rounded-full bg-etsa-primary/10 dark:bg-etsa-primary/20 px-4 py-2 text-sm font-medium text-etsa-primary">
            {tagsWithCount.length} total tags
          </div>
        </div>

        {/* Tags Grid */}
        <div className="mt-12">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tagsWithCount.map(({ tag, count }) => (
              <Link
                key={tag}
                href={getTagUrl(tag)}
                className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-etsa-primary dark:hover:border-etsa-primary"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white group-hover:text-etsa-primary transition-colors">
                      {tag}
                    </h3>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-200">
                      {count}
                    </span>
                  </div>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-etsa-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </Link>
            ))}
          </div>
        </div>

        {/* Back to Presentations */}
        <div className="mt-16 text-center">
          <Link
            href="/presentations"
            className="inline-flex items-center rounded-md bg-etsa-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-etsa-primary focus:ring-offset-2 transition-colors"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Presentations
          </Link>
        </div>
      </div>
    </div>
  );
}
