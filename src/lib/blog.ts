import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Post, PostSummary, PostFrontmatter, Speaker } from "@/types/post";

const postsDirectory = path.join(process.cwd(), "posts");
const blogPostsDirectory = path.join(process.cwd(), "posts_blog");

// Calculate reading time (average 200 words per minute)
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(words / wordsPerMinute);
  return readingTime;
}

// Helper function to sort posts by date (newest first)
function sortPostsByDate(posts: PostSummary[]): PostSummary[] {
  return posts.sort((a, b) => {
    return (
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
    );
  });
}

// Helper function to read posts from a directory
function readPostsFromDirectory(
  directory: string,
  slugs: string[],
  isBlogPost: boolean = false,
): PostSummary[] {
  return slugs
    .map((slug) => {
      try {
        const fullPath = path.join(directory, `${slug}.md`);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        const readingTime = calculateReadingTime(content);

        return {
          slug,
          frontmatter: isBlogPost
            ? ({ ...data, blogpost: true } as PostFrontmatter)
            : (data as PostFrontmatter),
          readingTime,
        };
      } catch (error) {
        console.error(
          `Error reading ${isBlogPost ? "blog" : "presentation"} post ${slug}:`,
          error,
        );
        return null;
      }
    })
    .filter((post): post is PostSummary => post !== null);
}

// Get all post slugs from both directories
export function getPostSlugs(): string[] {
  const slugs: string[] = [];

  // Get presentation posts from /posts
  if (fs.existsSync(postsDirectory)) {
    const presentationFiles = fs.readdirSync(postsDirectory);
    const presentationSlugs = presentationFiles
      .filter((fileName) => fileName.endsWith(".md"))
      .map((fileName) => fileName.replace(/\.md$/, ""));
    slugs.push(...presentationSlugs);
  }

  // Get blog posts from /posts_blog
  if (fs.existsSync(blogPostsDirectory)) {
    const blogFiles = fs.readdirSync(blogPostsDirectory);
    const blogSlugs = blogFiles
      .filter((fileName) => fileName.endsWith(".md"))
      .map((fileName) => fileName.replace(/\.md$/, ""));
    slugs.push(...blogSlugs);
  }

  return slugs;
}

// Get blog post slugs only
export function getBlogPostSlugs(): string[] {
  if (!fs.existsSync(blogPostsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(blogPostsDirectory);
  return fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

// Get presentation post slugs only
export function getPresentationPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

// Get post data by slug (checks both directories)
export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    // First check blog posts directory
    let fullPath = path.join(blogPostsDirectory, `${slug}.md`);

    // If not found in blog posts, check presentations directory
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(postsDirectory, `${slug}.md`);
    }

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    // Clean up invisible Unicode characters and normalize line breaks
    const cleanedContent = content
      .replace(/\u200B/g, "") // Remove zero-width spaces
      .replace(/\u200C/g, "") // Remove zero-width non-joiners
      .replace(/\u200D/g, "") // Remove zero-width joiners
      .replace(/\uFEFF/g, "") // Remove byte order marks
      .replace(/\r\n/g, "\n") // Normalize Windows line endings
      .replace(/\r/g, "\n") // Normalize Mac line endings
      .trim(); // Remove leading/trailing whitespace

    // Process markdown content to HTML
    const processedContent = await remark().use(html).process(cleanedContent);
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
  const posts: PostSummary[] = [];

  // Get presentation posts from /posts
  const presentationSlugs = getPresentationPostSlugs();
  const presentationPosts = readPostsFromDirectory(
    postsDirectory,
    presentationSlugs,
    false,
  );

  // Get blog posts from /posts_blog
  const blogSlugs = getBlogPostSlugs();
  const blogPosts = readPostsFromDirectory(blogPostsDirectory, blogSlugs, true);

  // Combine all posts
  posts.push(...presentationPosts, ...blogPosts);

  // Filter and sort
  return sortPostsByDate(
    posts.filter((post) => post.frontmatter.published !== false),
  );
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

  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

// Get tags with their usage count, sorted by popularity
export function getTagsWithCount(): Array<{ tag: string; count: number }> {
  const allPosts = getAllPosts();
  const tagCounts = new Map<string, number>();

  allPosts.forEach((post) => {
    post.frontmatter.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

// Get the most popular tags (limited number)
export function getPopularTags(limit: number = 25): string[] {
  return getTagsWithCount()
    .slice(0, limit)
    .map(({ tag }) => tag);
}

// Get blog posts only (from /posts_blog directory)
export function getBlogPosts(): PostSummary[] {
  const blogSlugs = getBlogPostSlugs();
  const posts = readPostsFromDirectory(blogPostsDirectory, blogSlugs, true);

  return sortPostsByDate(
    posts.filter((post) => post.frontmatter.published !== false),
  );
}

// Get presentation posts only (from /posts directory)
export function getPresentationPosts(): PostSummary[] {
  const presentationSlugs = getPresentationPostSlugs();
  const posts = readPostsFromDirectory(
    postsDirectory,
    presentationSlugs,
    false,
  );

  return sortPostsByDate(
    posts.filter((post) => post.frontmatter.published !== false),
  );
}

// Get recent blog posts
export function getRecentBlogPosts(limit: number = 5): PostSummary[] {
  const blogPosts = getBlogPosts();
  return blogPosts.slice(0, limit);
}

// Get recent presentation posts
export function getRecentPresentationPosts(limit: number = 5): PostSummary[] {
  const presentationPosts = getPresentationPosts();
  return presentationPosts.slice(0, limit);
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
  // Parse date components manually to avoid timezone issues
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Generate post URL
export function getPostUrl(slug: string): string {
  return `/presentation/${encodeURIComponent(slug)}`;
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

// Get all speakers from presentation posts (both legacy and new format)
export function getAllSpeakers(): string[] {
  const allPosts = getPresentationPosts();
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

  return Array.from(speakers).sort((a, b) => a.localeCompare(b));
}

// Get presentation posts by speaker name
export function getPostsBySpeaker(speakerName: string): PostSummary[] {
  const allPosts = getPresentationPosts();
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
