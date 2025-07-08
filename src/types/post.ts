export interface PostFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  author: string;
  speakerName?: string;
  speakerTitle?: string;
  speakerCompany?: string;
  speakerBio?: string;
  speakerImage?: string;
  speakerLinkedIn?: string;
  speakerTwitter?: string;
  speakerGitHub?: string;
  speakerWebsite?: string;
  presentationTitle?: string;
  presentationDescription?: string;
  presentationSlides?: string;
  presentationVideo?: string;
  eventDate?: string;
  eventLocation?: string;
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
