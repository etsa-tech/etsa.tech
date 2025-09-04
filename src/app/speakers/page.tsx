import {
  getAllSpeakers,
  getPostsBySpeaker,
  getPresentationPosts,
} from "@/lib/blog";
import { getPostSpeakers } from "@/lib/utils";
import { SpeakersTable } from "@/components/SpeakersTable";
import { ContentPageLayout } from "@/components/ContentPageLayout";
import { StatsCard } from "@/components/StatsCard";
import type { Speaker, PostSummary } from "@/types/post";

export const metadata = {
  title: "Speakers - ETSA",
  description:
    "Meet the talented speakers who have shared their expertise at ETSA meetups. Browse our community of technology professionals and their presentations.",
  openGraph: {
    title: "Speakers - ETSA",
    description:
      "Meet the talented speakers who have shared their expertise at ETSA meetups.",
    type: "website",
  },
};

interface SpeakerData {
  name: string;
  speaker: Speaker;
  talkCount: number;
  latestTalk: PostSummary | null;
  allTalks: PostSummary[];
  averageRating?: number;
}

export default function SpeakersPage() {
  const allPosts = getPresentationPosts();
  const speakerNames = getAllSpeakers();

  // Build comprehensive speaker data
  const speakersData: SpeakerData[] = speakerNames.map((speakerName) => {
    const speakerPosts = getPostsBySpeaker(speakerName);

    // Get the most complete speaker profile from their posts
    let mostCompleteSpeaker: Speaker = { name: speakerName };
    let maxFields = 0;

    speakerPosts.forEach((post) => {
      const speakers = getPostSpeakers(post.frontmatter);
      const currentSpeaker = speakers.find(
        (s) => s.name.toLowerCase() === speakerName.toLowerCase(),
      );

      if (currentSpeaker) {
        const fieldCount = Object.values(currentSpeaker).filter(
          (v) => v !== undefined && v !== null && v !== "",
        ).length;
        if (fieldCount > maxFields) {
          maxFields = fieldCount;
          mostCompleteSpeaker = currentSpeaker;
        }
      }
    });

    return {
      name: speakerName,
      speaker: mostCompleteSpeaker,
      talkCount: speakerPosts.length,
      latestTalk: speakerPosts[0] || null,
      allTalks: speakerPosts,
    };
  });

  // Sort by talk count (most active speakers first), then by name
  speakersData.sort((a, b) => {
    if (b.talkCount !== a.talkCount) {
      return b.talkCount - a.talkCount;
    }
    return a.name.localeCompare(b.name);
  });

  const totalSpeakers = speakersData.length;
  const totalTalks = allPosts.length;
  const averageTalksPerSpeaker =
    totalSpeakers > 0 ? (totalTalks / totalSpeakers).toFixed(1) : "0";
  const activeSpeakers = speakersData.filter((s) => s.talkCount > 1).length;

  const sidebar = (
    <>
      <StatsCard
        title="Speaker Statistics"
        stats={[
          { label: "Total Speakers", value: totalSpeakers },
          { label: "Total Presentations", value: totalTalks },
          { label: "Avg Talks/Speaker", value: averageTalksPerSpeaker },
          { label: "Multi-Talk Speakers", value: activeSpeakers },
        ]}
      />
    </>
  );

  return (
    <ContentPageLayout
      title="Our Speakers"
      description="Meet the talented professionals who have shared their expertise and insights with the ETSA community. From industry veterans to emerging innovators, our speakers represent the best in technology and leadership."
      sidebar={sidebar}
    >
      <div className="card">
        <div className="card-header">
          <h2 className="card-title text-2xl">Speaker Directory</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Search and explore our community of {totalSpeakers} speakers
          </p>
        </div>
        <div className="card-content p-0">
          <SpeakersTable speakers={speakersData} />
        </div>
      </div>
    </ContentPageLayout>
  );
}
