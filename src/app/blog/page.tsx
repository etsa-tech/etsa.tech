import { getBlogPosts } from "@/lib/blog";
import { ContentPageLayout } from "@/components/ContentPageLayout";
import { StatsCard } from "@/components/StatsCard";
import { TagsCard } from "@/components/TagsCard";
import BlogSearchComponent from "@/components/BlogSearchComponent";

export const metadata = {
  title: "Blog - ETSA",
  description:
    "Read our latest blog posts covering technology insights, tutorials, community updates, and industry trends from the ETSA community.",
};

export default function BlogPage() {
  const blogPosts = getBlogPosts();

  const sidebar = (
    <>
      <TagsCard title="Popular Tags" />
      <StatsCard
        title="Blog Stats"
        stats={[{ label: "Total Posts", value: blogPosts.length }]}
      />
    </>
  );

  const emptyState = (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📝</div>
      <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text mb-2">
        No blog posts yet
      </h2>
      <p className="text-light-muted dark:text-dark-muted mb-6">
        We haven&apos;t published any blog posts yet. Check back soon for
        updates!
      </p>
    </div>
  );

  return (
    <ContentPageLayout
      title="Blog"
      description="Discover insights, tutorials, and updates from the ETSA community. Stay informed about the latest trends in technology, systems administration, and DevOps practices."
      sidebar={sidebar}
      emptyState={emptyState}
      showEmptyState={blogPosts.length === 0}
    >
      <BlogSearchComponent posts={blogPosts} />
    </ContentPageLayout>
  );
}
