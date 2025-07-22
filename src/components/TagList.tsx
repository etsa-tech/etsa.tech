import Link from "next/link";
import { getTagUrl } from "@/lib/utils";

interface TagListProps {
  tags: string[];
  currentTag?: string;
  showCount?: boolean;
  tagCounts?: Record<string, number>;
}

export function TagList({
  tags,
  currentTag,
  showCount = false,
  tagCounts,
}: Readonly<TagListProps>) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isActive = currentTag === tag;
        const count = tagCounts?.[tag];

        return (
          <Link
            key={tag}
            href={getTagUrl(tag)}
            className={`tag transition-colors ${
              isActive ? "tag-primary" : "tag-default hover:tag-primary"
            }`}
          >
            {tag}
            {showCount && count && (
              <span className="ml-1 text-xs opacity-75">({count})</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

interface TagCloudProps {
  tags: string[];
  tagCounts: Record<string, number>;
  currentTag?: string;
}

export function TagCloud({
  tags,
  tagCounts,
  currentTag,
}: Readonly<TagCloudProps>) {
  if (tags.length === 0) {
    return null;
  }

  // Sort tags by count (descending) and then alphabetically
  const sortedTags = [...tags].sort((a, b) => {
    const countDiff = (tagCounts[b] || 0) - (tagCounts[a] || 0);
    if (countDiff !== 0) return countDiff;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
        Popular Tags
      </h3>
      <div className="flex flex-wrap gap-2">
        {sortedTags.map((tag) => {
          const isActive = currentTag === tag;
          const count = tagCounts[tag] || 0;

          // Calculate relative size based on count
          const maxCount = Math.max(...Object.values(tagCounts));
          const minCount = Math.min(...Object.values(tagCounts));
          const range = maxCount - minCount;
          const normalizedCount = range > 0 ? (count - minCount) / range : 0;

          // Map to text size classes
          const sizeClass =
            normalizedCount > 0.8
              ? "text-lg"
              : normalizedCount > 0.6
                ? "text-base"
                : normalizedCount > 0.4
                  ? "text-sm"
                  : "text-xs";

          return (
            <Link
              key={tag}
              href={getTagUrl(tag)}
              className={`inline-flex items-center px-3 py-1 rounded-full transition-colors ${sizeClass} ${
                isActive
                  ? "bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                  : "bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-200 hover:bg-primary-100 hover:text-primary-800 dark:hover:bg-primary-900 dark:hover:text-primary-200"
              }`}
            >
              {tag}
              <span className="ml-1 text-xs opacity-75">{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
