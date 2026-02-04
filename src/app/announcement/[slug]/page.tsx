import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import {
  getPostBySlug,
  getAnnouncementSlugs,
  getRecentAnnouncements,
} from "@/lib/blog";
import { formatDate, getTagUrl } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Force static generation at build time - reduces Netlify function count
export const dynamic = "force-static";
export const dynamicParams = false; // Only generate pages for known slugs
export const revalidate = false; // Never revalidate (pure static)

export async function generateStaticParams() {
  const slugs = getAnnouncementSlugs();
  return slugs.map((slug) => ({ slug: encodeURIComponent(slug) }));
}

export async function generateMetadata({ params }: Readonly<PageProps>) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPostBySlug(decodedSlug);

  if (!post) {
    return {
      title: "Announcement Not Found - ETSA",
    };
  }

  const { title, excerpt } = post.frontmatter;

  return {
    title: `${title} - ETSA Announcements`,
    description: excerpt,
    openGraph: {
      title: `${title} - ETSA Announcements`,
      description: excerpt,
      type: "article",
    },
  };
}

export default async function AnnouncementPage({
  params,
}: Readonly<PageProps>) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPostBySlug(decodedSlug);

  if (!post) {
    notFound();
  }

  const { frontmatter, content, readingTime } = post;
  const { title, date, tags, author } = frontmatter;

  const recentAnnouncements = getRecentAnnouncements(3).filter(
    (p) => p.slug !== decodedSlug,
  );

  return (
    <div className="container py-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <article className="prose prose-lg max-w-none">
            {/* Breadcrumb */}
            <nav className="not-prose mb-8">
              <ol className="flex items-center space-x-2 text-sm text-light-muted dark:text-dark-muted">
                <li>
                  <Link href="/" className="hover:text-primary-500">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li>
                  <Link
                    href="/announcements"
                    className="hover:text-primary-500"
                  >
                    Announcements
                  </Link>
                </li>
                <li>/</li>
                <li className="text-light-text dark:text-dark-text">{title}</li>
              </ol>
            </nav>

            {/* Article Header */}
            <header className="not-prose mb-8">
              <div className="inline-block px-3 py-1 bg-etsa-primary/10 dark:bg-etsa-primary/20 text-etsa-primary dark:text-etsa-light rounded-full text-sm font-medium mb-4">
                📢 Announcement
              </div>
              <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-4">
                {title}
              </h1>

              <div className="flex items-center space-x-4 text-sm text-light-muted dark:text-dark-muted mb-6">
                <time dateTime={date}>{formatDate(date)}</time>
                <span>•</span>
                <span>{readingTime} min read</span>
                {author && (
                  <>
                    <span>•</span>
                    <span>By {author}</span>
                  </>
                )}
              </div>

              {/* Tags */}
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
            </header>

            {/* Article Content */}
            <div
              className="prose-content"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(content, {
                  allowedTags: [
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "h5",
                    "h6",
                    "p",
                    "br",
                    "strong",
                    "em",
                    "u",
                    "s",
                    "ul",
                    "ol",
                    "li",
                    "blockquote",
                    "code",
                    "pre",
                    "a",
                    "img",
                    "table",
                    "thead",
                    "tbody",
                    "tr",
                    "th",
                    "td",
                    "div",
                    "span",
                  ],
                  allowedAttributes: {
                    a: ["href", "target", "rel"],
                    img: ["src", "alt", "width", "height"],
                    "*": ["class", "id"],
                  },
                  allowedSchemes: ["http", "https", "mailto"],
                }),
              }}
            />
          </article>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-8">
            {/* Recent Announcements */}
            {recentAnnouncements.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title text-lg">Recent Announcements</h3>
                </div>
                <div className="card-content space-y-4">
                  {recentAnnouncements.map((post) => (
                    <div
                      key={post.slug}
                      className="border-b border-light-border dark:border-dark-border last:border-b-0 pb-4 last:pb-0"
                    >
                      <Link
                        href={`/announcement/${encodeURIComponent(post.slug)}`}
                        className="block group"
                      >
                        <h4 className="font-medium text-light-text dark:text-dark-text group-hover:text-primary-500 transition-colors mb-1">
                          {post.frontmatter.title}
                        </h4>
                        <p className="text-sm text-light-muted dark:text-dark-muted">
                          {formatDate(post.frontmatter.date)}
                        </p>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Announcements */}
            <div className="card">
              <div className="card-content">
                <Link
                  href="/announcements"
                  className="btn btn-outline w-full justify-center"
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
                  Back to Announcements
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
