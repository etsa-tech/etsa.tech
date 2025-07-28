export interface Speaker {
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  image?: string;
  linkedIn?: string;
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
  speakerTwitter?: string;
  speakerGitHub?: string;
  speakerWebsite?: string;
  // New multiple speakers support
  speakers?: Speaker[];
  presentationTitle?: string;
  presentationDescription?: string;
  presentationSlides?: string;
  recordingUrl?: string;
  eventDate?: string;
  eventLocation?: string;
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
  featured?: boolean;
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
