import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllSpeakers, getPostsBySpeaker } from "@/lib/blog";
import { PostCard } from "@/components/PostCard";

interface PageProps {
  params: Promise<{ speaker: string }>;
}

export async function generateStaticParams() {
  const speakers = getAllSpeakers();
  return speakers.map((speaker) => ({
    speaker: encodeURIComponent(speaker.toLowerCase().replace(/\s+/g, "-")),
  }));
}

export async function generateMetadata({ params }: Readonly<PageProps>) {
  const { speaker } = await params;
  const decodedSpeaker = decodeURIComponent(speaker).replace(/-/g, " ");

  // Find the actual speaker name (case-insensitive)
  const allSpeakers = getAllSpeakers();
  const actualSpeaker = allSpeakers.find(
    (s) => s.toLowerCase() === decodedSpeaker.toLowerCase(),
  );

  if (!actualSpeaker) {
    return {
      title: "Speaker Not Found - ETSA",
    };
  }

  const posts = getPostsBySpeaker(actualSpeaker);

  return {
    title: `${actualSpeaker} - Speaker at ETSA`,
    description: `View all presentations by ${actualSpeaker} at ETSA meetups. ${
      posts.length
    } presentation${posts.length !== 1 ? "s" : ""} available.`,
    openGraph: {
      title: `${actualSpeaker} - Speaker at ETSA`,
      description: `View all presentations by ${actualSpeaker} at ETSA meetups.`,
      type: "profile",
    },
  };
}

export default async function SpeakerPage({ params }: Readonly<PageProps>) {
  const { speaker } = await params;
  const decodedSpeaker = decodeURIComponent(speaker).replace(/-/g, " ");

  // Find the actual speaker name (case-insensitive)
  const allSpeakers = getAllSpeakers();
  const actualSpeaker = allSpeakers.find(
    (s) => s.toLowerCase() === decodedSpeaker.toLowerCase(),
  );

  if (!actualSpeaker) {
    notFound();
  }

  const posts = getPostsBySpeaker(actualSpeaker);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="mb-12">
        <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-primary-500 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/speakers"
            className="hover:text-primary-500 transition-colors"
          >
            Speakers
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">
            {actualSpeaker}
          </span>
        </nav>

        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {actualSpeaker}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {posts.length} presentation{posts.length !== 1 ? "s" : ""} at ETSA
            meetups
          </p>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      {/* Back to Speakers */}
      <div className="mt-12 text-center">
        <Link
          href="/speakers"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
        >
          <svg
            className="mr-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to All Speakers
        </Link>
      </div>
    </div>
  );
}
