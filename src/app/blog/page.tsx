import { getBlogPosts } from "@/lib/blog";
import { ContentPageLayout } from "@/components/ContentPageLayout";
import { StatsCard } from "@/components/StatsCard";
import { TagsCard } from "@/components/TagsCard";
import { EmptyState } from "@/components/EmptyState";
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
    <EmptyState
      icon="📝"
      title="No blog posts yet"
      description="We haven't published any blog posts yet. Check back soon for updates!"
    />
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
