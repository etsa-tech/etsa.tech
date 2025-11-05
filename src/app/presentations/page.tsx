import {
  getPresentationPosts,
  getAllTags,
  getAllSpeakers,
  getBlogPosts,
} from "@/lib/blog";
import { ContentPageLayout } from "@/components/ContentPageLayout";
import { StatsCard } from "@/components/StatsCard";
import { TagsCard } from "@/components/TagsCard";
import SearchComponent from "@/components/SearchComponent";

export const metadata = {
  title: "Presentations - ETSA",
  description:
    "Explore presentations from our amazing speakers at ETSA meetups. Learn from industry experts in systems administration, DevOps, and technology.",
};

export default function PresentationsPage() {
  const posts = getPresentationPosts();
  const blogPosts = getBlogPosts();
  const allTags = getAllTags();
  const allSpeakers = getAllSpeakers();

  const sidebar = (
    <>
      <TagsCard title="Browse by Topic" limit={25} showViewAll={true} />
      <StatsCard
        title="Statistics"
        stats={[
          { label: "Total Presentations", value: posts.length },
          { label: "Unique Topics", value: allTags.length },
          { label: "Unique Speakers", value: allSpeakers.length },
          {
            label: "Blog Posts",
            value: blogPosts.length,
          },
        ]}
      />
    </>
  );

  return (
    <ContentPageLayout
      title="Presentations"
      description="Explore presentations from our amazing speakers at ETSA meetups. Learn from industry experts in systems administration, DevOps, cloud computing, and emerging technologies."
      sidebar={sidebar}
    >
      <SearchComponent posts={posts} />
    </ContentPageLayout>
  );
}
