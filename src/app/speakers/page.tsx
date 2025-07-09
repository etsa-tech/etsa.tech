import { getAllPosts, getAllTags } from "@/lib/blog";
import { TagCloud } from "@/components/TagList";
import SearchComponent from "@/components/SearchComponent";

export const metadata = {
  title: "Past Speakers - ETSA",
  description:
    "Explore presentations from our amazing speakers at ETSA meetups. Learn from industry experts in systems administration, DevOps, and technology.",
};

export default function SpeakersPage() {
  const posts = getAllPosts();
  const allTags = getAllTags();

  // Calculate tag counts
  const tagCounts = allTags.reduce(
    (acc, tag) => {
      acc[tag] = posts.filter((post) =>
        post.frontmatter.tags.some(
          (postTag) => postTag.toLowerCase() === tag.toLowerCase(),
        ),
      ).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Past Speakers
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Explore presentations from our amazing speakers at ETSA meetups. Learn
          from industry experts in systems administration, DevOps, cloud
          computing, and emerging technologies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <SearchComponent posts={posts} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-8">
            {/* Tag Cloud */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Browse by Topic</h3>
              </div>
              <div className="card-content">
                <TagCloud tags={allTags} tagCounts={tagCounts} />
              </div>
            </div>

            {/* Stats */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Statistics</h3>
              </div>
              <div className="card-content space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Presentations
                  </span>
                  <span className="font-semibold text-etsa-primary">
                    {posts.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Unique Topics
                  </span>
                  <span className="font-semibold text-etsa-primary">
                    {allTags.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Featured
                  </span>
                  <span className="font-semibold text-etsa-primary">
                    {posts.filter((p) => p.frontmatter.featured).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
