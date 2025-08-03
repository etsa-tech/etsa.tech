import { getBlogPosts, getAllTags } from "@/lib/blog";
import PopularTags from "@/components/PopularTags";
import BlogSearchComponent from "@/components/BlogSearchComponent";

export const metadata = {
  title: "Blog - ETSA",
  description:
    "Read our latest blog posts covering technology insights, tutorials, community updates, and industry trends from the ETSA community.",
};

export default function BlogPage() {
  const blogPosts = getBlogPosts();
  const allTags = getAllTags();

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Blog
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Discover insights, tutorials, and updates from the ETSA community.
          Stay informed about the latest trends in technology, systems
          administration, and DevOps practices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <BlogSearchComponent posts={blogPosts} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-8">
            {/* Popular Tags */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Popular Tags</h3>
              </div>
              <div className="card-content">
                <PopularTags />
              </div>
            </div>

            {/* Blog Stats */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Blog Stats</h3>
              </div>
              <div className="card-content space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Posts
                  </span>
                  <span className="font-semibold text-etsa-primary">
                    {blogPosts.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* No posts message */}
      {blogPosts.length === 0 && (
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
      )}
    </div>
  );
}
