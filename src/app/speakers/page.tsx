import { getAllSpeakers, getPostsBySpeaker, getAllPosts } from "@/lib/blog";
import { getPostSpeakers } from "@/lib/utils";
import { SpeakersTable } from "@/components/SpeakersTable";
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
  totalViews?: number;
  averageRating?: number;
}

export default function SpeakersPage() {
  const allPosts = getAllPosts();
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
      // Future enhancements
      totalViews: Math.floor(Math.random() * 5000) + 500, // Placeholder for analytics
      averageRating: Number((Math.random() * 2 + 3).toFixed(1)), // Placeholder for ratings
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Our Speakers
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Meet the talented professionals who have shared their expertise and
            insights with the ETSA community. From industry veterans to emerging
            innovators, our speakers represent the best in technology and
            leadership.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-3xl font-bold text-etsa-primary mb-2">
              {totalSpeakers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Speakers
            </div>
          </div>
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-3xl font-bold text-etsa-primary mb-2">
              {totalTalks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Presentations
            </div>
          </div>
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-3xl font-bold text-etsa-primary mb-2">
              {averageTalksPerSpeaker}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Avg Talks/Speaker
            </div>
          </div>
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-3xl font-bold text-etsa-primary mb-2">
              {activeSpeakers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Multi-Talk Speakers
            </div>
          </div>
        </div>

        {/* Speakers Table */}
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
      </div>
    </div>
  );
}
