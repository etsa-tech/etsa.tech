import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostsByTag, getAllTags } from "@/lib/blog";
import { PostCard } from "@/components/PostCard";

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const tags = getAllTags();
  return tags.map((tag) => ({ tag: encodeURIComponent(tag.toLowerCase()) }));
}

export async function generateMetadata({ params }: Readonly<PageProps>) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  return {
    title: `${decodedTag} Posts - ETSA`,
    description: `Browse all ETSA presentations and content tagged with "${decodedTag}".`,
  };
}

export default async function TagPage({ params }: Readonly<PageProps>) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  // Find the actual tag (case-insensitive)
  const allTags = getAllTags();
  const actualTag = allTags.find(
    (t) => t.toLowerCase() === decodedTag.toLowerCase(),
  );

  if (!actualTag) {
    notFound();
  }

  const posts = getPostsByTag(actualTag);

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="mb-12">
        {/* Breadcrumb */}
        <nav className="mb-6">
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
            <li className="text-light-text dark:text-dark-text">
              Tag: {actualTag}
            </li>
          </ol>
        </nav>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-4">
              Posts tagged with &quot;{actualTag}&quot;
            </h1>
            <p className="text-light-muted dark:text-dark-muted">
              {posts.length} presentation{posts.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <div className="tag tag-primary text-lg px-4 py-2">{actualTag}</div>
        </div>
      </div>

      {/* Posts */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text mb-2">
            No posts found
          </h2>
          <p className="text-light-muted dark:text-dark-muted mb-6">
            We couldn&apos;t find any presentations tagged with &quot;
            {actualTag}&quot;.
          </p>
          <Link href="/speakers" className="btn btn-primary">
            Browse All Presentations
          </Link>
        </div>
      )}

      {/* Related Tags */}
      {posts.length > 0 &&
        (() => {
          // Find tags that frequently appear together with the current tag
          const tagCooccurrence = new Map<string, number>();

          // Count how often each tag appears with the current tag
          posts.forEach((post) => {
            post.frontmatter.tags.forEach((tag) => {
              if (tag.toLowerCase() !== actualTag.toLowerCase()) {
                const normalizedTag = tag;
                tagCooccurrence.set(
                  normalizedTag,
                  (tagCooccurrence.get(normalizedTag) || 0) + 1,
                );
              }
            });
          });

          // Sort by co-occurrence frequency and take top 10
          const relatedTags = Array.from(tagCooccurrence.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .slice(0, 10)
            .map(([tag]) => tag);

          return relatedTags.length > 0 ? (
            <div className="mt-16 pt-8 border-t border-light-border dark:border-dark-border">
              <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-6">
                Related Tags
              </h2>
              <p className="text-sm text-light-muted dark:text-dark-muted mb-4">
                Tags that frequently appear together with {actualTag}
              </p>
              <div className="flex flex-wrap gap-2">
                {relatedTags.map((relatedTag) => {
                  const count = tagCooccurrence.get(relatedTag) || 0;
                  return (
                    <Link
                      key={relatedTag}
                      href={`/tag/${encodeURIComponent(
                        relatedTag.toLowerCase(),
                      )}`}
                      className="tag tag-default hover:tag-primary transition-colors"
                      title={`Appears together in ${count} presentation${
                        count !== 1 ? "s" : ""
                      }`}
                    >
                      {relatedTag} ({count})
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null;
        })()}
    </div>
  );
}
