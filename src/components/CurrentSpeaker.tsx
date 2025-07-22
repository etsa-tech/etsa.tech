import Link from "next/link";
import { PostSummary } from "@/types/post";
import { formatDate, getPostUrl } from "@/lib/utils";

interface CurrentSpeakerProps {
  latestPost: PostSummary | null;
}

export function CurrentSpeaker({ latestPost }: Readonly<CurrentSpeakerProps>) {
  if (!latestPost) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Current Speaker</h2>
        </div>
        <div className="card-content">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
              No upcoming speakers
            </h3>
            <p className="text-light-muted dark:text-dark-muted">
              Check back soon for our next meetup announcement!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { frontmatter, slug } = latestPost;
  const {
    title,
    date,
    speakerName,
    speakerTitle,
    speakerCompany,
    speakerBio,
    presentationTitle,
    eventDate,
    eventLocation,
  } = frontmatter;

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Latest Presentation</h2>
        {eventDate && (
          <p className="card-description">
            {formatDate(eventDate)} {eventLocation && `• ${eventLocation}`}
          </p>
        )}
      </div>
      <div className="card-content">
        <div className="space-y-4">
          {/* Speaker Info */}
          {speakerName && (
            <div>
              <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
                {speakerName}
              </h3>
              {speakerTitle && (
                <p className="text-light-muted dark:text-dark-muted">
                  {speakerTitle}
                  {speakerCompany && ` at ${speakerCompany}`}
                </p>
              )}
              {speakerBio && (
                <p className="text-sm text-light-muted dark:text-dark-muted mt-2">
                  {speakerBio}
                </p>
              )}
            </div>
          )}

          {/* Presentation Info */}
          <div>
            <h4 className="text-lg font-medium text-light-text dark:text-dark-text mb-2">
              {presentationTitle || title}
            </h4>
            <p className="text-light-muted dark:text-dark-muted text-sm">
              Presented on {formatDate(date)}
            </p>
          </div>

          {/* Call to Action */}
          <div className="pt-4">
            <Link href={getPostUrl(slug)} className="btn btn-primary btn-sm">
              View Presentation Details
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
