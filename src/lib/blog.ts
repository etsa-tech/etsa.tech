import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Post, PostSummary, PostFrontmatter, Speaker } from "@/types/post";

const postsDirectory = path.join(process.cwd(), "posts");

// Calculate reading time (average 200 words per minute)
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(words / wordsPerMinute);
  return readingTime;
}

// Get all post slugs
export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

// Get post data by slug
export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    // Process markdown content to HTML
    const processedContent = await remark().use(html).process(content);
    const contentHtml = processedContent.toString();

    const readingTime = calculateReadingTime(content);

    return {
      slug,
      frontmatter: data as PostFrontmatter,
      content: contentHtml,
      readingTime,
    };
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

// Get all posts with frontmatter only (for listing pages)
export function getAllPosts(): PostSummary[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => {
      try {
        const fullPath = path.join(postsDirectory, `${slug}.md`);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        const readingTime = calculateReadingTime(content);

        return {
          slug,
          frontmatter: data as PostFrontmatter,
          readingTime,
        };
      } catch (error) {
        console.error(`Error reading post ${slug}:`, error);
        return null;
      }
    })
    .filter((post): post is PostSummary => post !== null)
    .filter((post) => post.frontmatter.published !== false)
    .sort((a, b) => {
      // Sort by date, newest first
      return (
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime()
      );
    });

  return posts;
}

// Get posts by tag
export function getPostsByTag(tag: string): PostSummary[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) =>
    post.frontmatter.tags.some(
      (postTag) => postTag.toLowerCase() === tag.toLowerCase(),
    ),
  );
}

// Get all unique tags
export function getAllTags(): string[] {
  const allPosts = getAllPosts();
  const tags = new Set<string>();

  allPosts.forEach((post) => {
    post.frontmatter.tags.forEach((tag) => {
      tags.add(tag);
    });
  });

  return Array.from(tags).sort();
}

// Get featured posts
export function getFeaturedPosts(): PostSummary[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => post.frontmatter.featured === true);
}

// Get recent posts
export function getRecentPosts(limit: number = 5): PostSummary[] {
  const allPosts = getAllPosts();
  return allPosts.slice(0, limit);
}

// Get the latest post (for current speaker display)
export function getLatestPost(): PostSummary | null {
  const allPosts = getAllPosts();
  return allPosts.length > 0 ? allPosts[0] : null;
}

// Search posts by title, excerpt, or content
export function searchPosts(query: string): PostSummary[] {
  const allPosts = getAllPosts();
  const searchTerm = query.toLowerCase();

  return allPosts.filter((post) => {
    const { title, excerpt, tags } = post.frontmatter;

    return (
      title.toLowerCase().includes(searchTerm) ||
      excerpt.toLowerCase().includes(searchTerm) ||
      tags.some((tag) => tag.toLowerCase().includes(searchTerm))
    );
  });
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Generate post URL
export function getPostUrl(slug: string): string {
  return `/speakers/${slug}`;
}

// Generate tag URL
export function getTagUrl(tag: string): string {
  return `/tag/${encodeURIComponent(tag.toLowerCase())}`;
}

// Generate speaker URL
export function getSpeakerUrl(speakerName: string): string {
  return `/speaker/${encodeURIComponent(
    speakerName.toLowerCase().replace(/\s+/g, "-"),
  )}`;
}

// Get all speakers from posts (both legacy and new format)
export function getAllSpeakers(): string[] {
  const allPosts = getAllPosts();
  const speakers = new Set<string>();

  allPosts.forEach((post) => {
    const { frontmatter } = post;

    // Handle legacy single speaker format
    if (frontmatter.speakerName) {
      speakers.add(frontmatter.speakerName);
    }

    // Handle new multiple speakers format
    if (frontmatter.speakers) {
      frontmatter.speakers.forEach((speaker) => {
        speakers.add(speaker.name);
      });
    }
  });

  return Array.from(speakers).sort();
}

// Get posts by speaker name
export function getPostsBySpeaker(speakerName: string): PostSummary[] {
  const allPosts = getAllPosts();
  const normalizedSpeakerName = speakerName.toLowerCase();

  return allPosts.filter((post) => {
    const { frontmatter } = post;

    // Check legacy single speaker format
    if (
      frontmatter.speakerName &&
      frontmatter.speakerName.toLowerCase() === normalizedSpeakerName
    ) {
      return true;
    }

    // Check new multiple speakers format
    if (frontmatter.speakers) {
      return frontmatter.speakers.some(
        (speaker) => speaker.name.toLowerCase() === normalizedSpeakerName,
      );
    }

    return false;
  });
}

// Get all speakers from a post (unified function)
export function getPostSpeakers(frontmatter: PostFrontmatter): Speaker[] {
  const speakers: Speaker[] = [];

  // Handle legacy single speaker format
  if (frontmatter.speakerName) {
    speakers.push({
      name: frontmatter.speakerName,
      title: frontmatter.speakerTitle,
      company: frontmatter.speakerCompany,
      bio: frontmatter.speakerBio,
      image: frontmatter.speakerImage,
      linkedIn: frontmatter.speakerLinkedIn,
      twitter: frontmatter.speakerTwitter,
      github: frontmatter.speakerGitHub,
      website: frontmatter.speakerWebsite,
    });
  }

  // Handle new multiple speakers format
  if (frontmatter.speakers) {
    speakers.push(...frontmatter.speakers);
  }

  return speakers;
}
