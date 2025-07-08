import { getAllPosts, getAllTags } from '@/lib/blog';
import { PostCard } from '@/components/PostCard';
import { TagCloud } from '@/components/TagList';

export const metadata = {
  title: 'Past Speakers - ETSA',
  description: 'Explore presentations from our amazing speakers at ETSA meetups. Learn from industry experts in systems administration, DevOps, and technology.',
};

export default function SpeakersPage() {
  const posts = getAllPosts();
  const allTags = getAllTags();
  
  // Calculate tag counts
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = posts.filter(post => 
      post.frontmatter.tags.some(postTag => 
        postTag.toLowerCase() === tag.toLowerCase()
      )
    ).length;
    return acc;
  }, {} as Record<string, number>);

  const featuredPosts = posts.filter(post => post.frontmatter.featured);
  const regularPosts = posts.filter(post => !post.frontmatter.featured);

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-4">
          Past Speakers
        </h1>
        <p className="text-xl text-light-muted dark:text-dark-muted max-w-3xl mx-auto">
          Explore presentations from our amazing speakers at ETSA meetups. Learn from industry
          experts in systems administration, DevOps, cloud computing, and emerging technologies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-6">
                Featured Presentations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featuredPosts.map((post) => (
                  <PostCard key={post.slug} post={post} featured />
                ))}
              </div>
            </section>
          )}

          {/* All Posts */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">
                All Presentations
              </h2>
              <span className="text-sm text-light-muted dark:text-dark-muted">
                {posts.length} presentation{posts.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎤</div>
                <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
                  No presentations yet
                </h3>
                <p className="text-light-muted dark:text-dark-muted">
                  We&apos;re working on adding content from our past speakers. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {regularPosts.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-8">
            {/* Search */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Search Presentations</h3>
              </div>
              <div className="card-content">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by title, speaker, or topic..."
                    className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-muted dark:placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <svg
                    className="absolute right-3 top-2.5 h-5 w-5 text-light-muted dark:text-dark-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Tag Cloud */}
            {allTags.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title text-lg">Topics</h3>
                </div>
                <div className="card-content">
                  <TagCloud tags={allTags} tagCounts={tagCounts} />
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="card bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800">
              <div className="card-header">
                <h3 className="card-title text-lg text-primary-900 dark:text-primary-100">
                  Want to Speak?
                </h3>
              </div>
              <div className="card-content">
                <p className="text-primary-800 dark:text-primary-200 text-sm mb-4">
                  Share your knowledge with the ETSA community! We&apos;re always looking for speakers.
                </p>
                <a
                  href="/contact"
                  className="btn btn-primary btn-sm w-full"
                >
                  Propose a Talk
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
