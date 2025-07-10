import Link from "next/link";
import { getSpeakerUrl } from "@/lib/utils";

interface SpeakerLinkProps {
  speakerName: string;
  className?: string;
  children?: React.ReactNode;
}

export function SpeakerLink({
  speakerName,
  className = "",
  children,
}: SpeakerLinkProps) {
  return (
    <Link
      href={getSpeakerUrl(speakerName)}
      className={`hover:text-primary-500 transition-colors cursor-pointer ${className}`}
      title={`View all presentations by ${speakerName}`}
    >
      {children || speakerName}
    </Link>
  );
}

interface SpeakerListProps {
  speakers: Array<{ name: string; title?: string; company?: string }>;
  className?: string;
  showTitles?: boolean;
}

export function SpeakerList({
  speakers,
  className = "",
  showTitles = true,
}: SpeakerListProps) {
  if (speakers.length === 0) return null;

  return (
    <div className={className}>
      {speakers.map((speaker, index) => (
        <span key={speaker.name}>
          <SpeakerLink speakerName={speaker.name} />
          {showTitles && speaker.title && (
            <span className="text-gray-600 dark:text-gray-400">
              {speaker.company
                ? ` (${speaker.title} at ${speaker.company})`
                : ` (${speaker.title})`}
            </span>
          )}
          {index < speakers.length - 1 && (
            <span className="text-gray-500 dark:text-gray-400">
              {index === speakers.length - 2 ? " and " : ", "}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
