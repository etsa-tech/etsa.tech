export interface Speaker {
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  image?: string;
  linkedIn?: string;
  // LinkedIn member URN (urn:li:person:{linkedInUrn}), captured when the
  // speaker completes their own one-time LinkedIn OAuth connect - required
  // for a real, notifying @mention on LinkedIn posts. LinkedIn gives no way
  // to resolve this from the plain `linkedIn` profile URL above.
  linkedInUrn?: string;
  twitter?: string;
  github?: string;
  website?: string;
}

export interface PostFrontmatter {
  description?: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  author: string;
  // Legacy single speaker fields (for backward compatibility)
  speakerName?: string;
  speakerTitle?: string;
  speakerCompany?: string;
  speakerBio?: string;
  speakerImage?: string;
  speakerLinkedIn?: string;
  speakerLinkedInUrn?: string;
  speakerTwitter?: string;
  speakerGitHub?: string;
  speakerWebsite?: string;
  // New multiple speakers support
  speakers?: Speaker[];
  presentationTitle?: string;
  presentationDescription?: string;
  presentationSlides?: string;
  recordingUrl?: string;
  meetupEventId?: string;
  eventDate?: string;
  eventLocation?:
    | string
    | {
        name: string;
        address?: string;
        coordinates?: {
          lat: string;
          lng: string;
        };
      };
  meetingDate?: string;
  meetingLocation?: {
    name: string;
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    description?: string;
    parking?: string;
    accessibility?: string;
    contact?: string;
  };
  blogpost?: boolean; // Whether this is a blog post (true) or presentation (false/undefined)
  published?: boolean;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
  readingTime: number;
}

export interface PostSummary {
  slug: string;
  frontmatter: PostFrontmatter;
  readingTime: number;
}
