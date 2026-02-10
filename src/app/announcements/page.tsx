import { getAnnouncements } from "@/lib/blog";
import { ContentPageLayout } from "@/components/ContentPageLayout";
import { StatsCard } from "@/components/StatsCard";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/PostCard";

export const metadata = {
  title: "Announcements - ETSA",
  description:
    "Stay up to date with the latest announcements from ETSA. Important updates, community news, and organizational changes.",
};

// Force static generation at build time
export const dynamic = "force-static";
export const revalidate = false; // Never revalidate (pure static)

export default function AnnouncementsPage() {
  const announcements = getAnnouncements();
  const recentAnnouncements = announcements.slice(0, 3);

  const sidebar = (
    <>
      <StatsCard
        title="Announcements"
        stats={[{ label: "Total Announcements", value: announcements.length }]}
      />
    </>
  );

  const emptyState = (
    <EmptyState
      icon="📢"
      title="No announcements yet"
      description="We haven't published any announcements yet. Check back soon for updates!"
    />
  );

  return (
    <ContentPageLayout
      title="Announcements"
      description="Stay informed with the latest news and updates from ETSA. Important announcements, community updates, and organizational changes."
      sidebar={sidebar}
      emptyState={emptyState}
      showEmptyState={announcements.length === 0}
    >
      {announcements.length > 0 && (
        <div className="space-y-8">
          {/* Latest Announcement - Featured */}
          {announcements[0] && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Latest Announcement
              </h2>
              <div className="border-2 border-etsa-primary dark:border-etsa-light rounded-lg p-1">
                <PostCard post={announcements[0]} showSpeakers={false} />
              </div>
            </div>
          )}

          {/* Recent Announcements */}
          {recentAnnouncements.length > 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Recent Announcements
              </h2>
              <div className="space-y-6">
                {recentAnnouncements.slice(1).map((announcement) => (
                  <PostCard
                    key={announcement.slug}
                    post={announcement}
                    showSpeakers={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ContentPageLayout>
  );
}
