import Link from "next/link";
import { PostSummary } from "@/types/post";
import {
  formatDate,
  getPostUrl,
  getTagUrl,
  getPostSpeakers,
} from "@/lib/utils";
import { SpeakerList } from "@/components/SpeakerLink";

interface PostCardProps {
  post: PostSummary;
  featured?: boolean;
}

export function PostCard({ post, featured = false }: Readonly<PostCardProps>) {
  const { slug, frontmatter, readingTime } = post;
  const { title, date, excerpt, tags } = frontmatter;

  const speakers = getPostSpeakers(frontmatter);

  return (
    <article
      className={`card hover:shadow-md transition-shadow ${
        featured ? "border-blue-200 dark:border-blue-800" : ""
      }`}
    >
      <div className="card-header">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link href={getPostUrl(slug)} className="group">
              <h3
                className={`card-title group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                  featured ? "text-xl" : "text-lg"
                }`}
              >
                {title}
              </h3>
            </Link>

            {speakers.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">
                  Speaker{speakers.length > 1 ? "s" : ""}:{" "}
                </span>
                <SpeakerList speakers={speakers} showTitles={false} />
              </div>
            )}
          </div>

          {featured && <span className="tag tag-primary ml-4">Featured</span>}
        </div>

        <div className="flex items-center space-x-4 text-sm text-light-muted dark:text-dark-muted mt-3">
          <time dateTime={date}>{formatDate(date)}</time>
          <span>•</span>
          <span>{readingTime} min read</span>
        </div>
      </div>

      <div className="card-content">
        <p className="text-light-muted dark:text-dark-muted leading-relaxed">
          {excerpt}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={getTagUrl(tag)}
                className="tag tag-default hover:tag-primary transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card-footer">
        <Link href={getPostUrl(slug)} className="btn btn-outline btn-sm">
          Read More
          <svg
            className="ml-2 h-4 w-4"
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
    </article>
  );
}
