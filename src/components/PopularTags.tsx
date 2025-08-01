import Link from "next/link";
import { getTagsWithCount } from "@/lib/blog";
import { getTagUrl } from "@/lib/utils";

interface PopularTagsProps {
  className?: string;
  limit?: number;
  showViewAll?: boolean;
}

export default function PopularTags({
  className = "",
  limit = 25,
  showViewAll = true,
}: Readonly<PopularTagsProps>) {
  const tagsWithCount = getTagsWithCount().slice(0, limit);

  if (tagsWithCount.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Popular Tags
        </h3>
        {showViewAll && (
          <Link
            href="/tags"
            className="text-sm font-medium text-etsa-primary hover:text-etsa-primary-dark transition-colors"
          >
            View All Tags →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tagsWithCount.map(({ tag, count }) => (
          <Link
            key={tag}
            href={getTagUrl(tag)}
            className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-etsa-primary hover:text-white transition-colors duration-200"
          >
            <span>{tag}</span>
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full group-hover:bg-white/20 group-hover:text-white transition-colors">
              {count}
            </span>
          </Link>
        ))}
      </div>

      {showViewAll && tagsWithCount.length >= limit && (
        <div className="mt-4 text-center">
          <Link
            href="/tags"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-etsa-primary transition-colors"
          >
            <span>Showing {limit} most popular tags</span>
            <svg
              className="ml-1 h-4 w-4"
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
          </Link>
        </div>
      )}
    </div>
  );
}
