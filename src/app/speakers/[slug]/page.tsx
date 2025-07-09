import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPostBySlug, getPostSlugs, getRecentPosts } from "@/lib/blog";
import { formatDate, getTagUrl, getPostSpeakers } from "@/lib/utils";
import { SpeakerList } from "@/components/SpeakerLink";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found - ETSA",
    };
  }

  const { title, excerpt } = post.frontmatter;
  const speakers = getPostSpeakers(post.frontmatter);

  return {
    title: `${title} - ETSA`,
    description: excerpt,
    openGraph: {
      title: `${title} - ETSA`,
      description: excerpt,
      type: "article",
      authors: speakers.length > 0 ? speakers.map((s) => s.name) : undefined,
    },
  };
}

export default async function SpeakerPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { frontmatter, content, readingTime } = post;
  const {
    title,
    date,
    tags,
    presentationSlides,
    presentationVideo,
    eventDate,
    eventLocation,
  } = frontmatter;

  const speakers = getPostSpeakers(frontmatter);

  const recentPosts = getRecentPosts(3).filter((p) => p.slug !== slug);

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
                  <Link href="/speakers" className="hover:text-primary-500">
                    Speakers
                  </Link>
                </li>
                <li>/</li>
                <li className="text-light-text dark:text-dark-text">{title}</li>
              </ol>
            </nav>

            {/* Header */}
            <header className="not-prose mb-8">
              <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-4">
                {title}
              </h1>

              <div className="flex items-center space-x-4 text-sm text-light-muted dark:text-dark-muted mb-6">
                <time dateTime={date}>{formatDate(date)}</time>
                <span>•</span>
                <span>{readingTime} min read</span>
                {eventDate && (
                  <>
                    <span>•</span>
                    <span>Event: {formatDate(eventDate)}</span>
                  </>
                )}
                {eventLocation && (
                  <>
                    <span>•</span>
                    <span>{eventLocation}</span>
                  </>
                )}
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
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

            {/* Speaker Info */}
            {speakers.length > 0 && (
              <div className="not-prose card mb-8">
                <div className="card-header">
                  <h2 className="card-title">
                    About the Speaker{speakers.length > 1 ? "s" : ""}
                  </h2>
                </div>
                <div className="card-content space-y-6">
                  {speakers.map((speaker) => (
                    <div
                      key={speaker.name}
                      className="flex items-start space-x-4"
                    >
                      {speaker.image && (
                        <Image
                          src={speaker.image}
                          alt={speaker.name}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                          <SpeakerList
                            speakers={[speaker]}
                            showTitles={false}
                          />
                        </h3>
                        {speaker.title && (
                          <p className="text-light-muted dark:text-dark-muted">
                            {speaker.title}
                            {speaker.company && ` at ${speaker.company}`}
                          </p>
                        )}
                        {speaker.bio && (
                          <p className="text-sm text-light-muted dark:text-dark-muted mt-2">
                            {speaker.bio}
                          </p>
                        )}

                        {/* Speaker Social Links */}
                        <div className="flex items-center space-x-3 mt-3">
                          {speaker.linkedIn && (
                            <a
                              href={speaker.linkedIn}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-light-muted dark:text-dark-muted hover:text-primary-500 transition-colors"
                              aria-label="LinkedIn"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                              </svg>
                            </a>
                          )}
                          {speaker.twitter && (
                            <a
                              href={speaker.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-light-muted dark:text-dark-muted hover:text-primary-500 transition-colors"
                              aria-label="Twitter"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                              </svg>
                            </a>
                          )}
                          {speaker.github && (
                            <a
                              href={speaker.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-light-muted dark:text-dark-muted hover:text-primary-500 transition-colors"
                              aria-label="GitHub"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                              </svg>
                            </a>
                          )}
                          {speaker.website && (
                            <a
                              href={speaker.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-light-muted dark:text-dark-muted hover:text-primary-500 transition-colors"
                              aria-label="Website"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                                />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Presentation Resources */}
            {(presentationSlides || presentationVideo) && (
              <div className="not-prose card mb-8">
                <div className="card-header">
                  <h2 className="card-title">Presentation Resources</h2>
                </div>
                <div className="card-content">
                  <div className="flex flex-wrap gap-4">
                    {presentationSlides && (
                      <a
                        href={presentationSlides}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
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
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        View Slides
                      </a>
                    )}
                    {presentationVideo && (
                      <a
                        href={presentationVideo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
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
                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10v4a2 2 0 002 2h2a2 2 0 002-2v-4M9 10V8a2 2 0 012-2h2a2 2 0 012 2v2"
                          />
                        </svg>
                        Watch Video
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </article>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-8">
            {/* Recent Posts */}
            {recentPosts.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title text-lg">Recent Presentations</h3>
                </div>
                <div className="card-content space-y-4">
                  {recentPosts.map((post) => (
                    <div
                      key={post.slug}
                      className="border-b border-light-border dark:border-dark-border last:border-b-0 pb-4 last:pb-0"
                    >
                      <Link
                        href={`/speakers/${post.slug}`}
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

            {/* Back to Speakers */}
            <div className="card">
              <div className="card-content">
                <Link
                  href="/speakers"
                  className="btn btn-outline btn-sm w-full"
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
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back to All Speakers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
