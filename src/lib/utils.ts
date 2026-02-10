// Utility functions that can be used on both client and server
import sanitizeHtml from "sanitize-html";
import { PostFrontmatter, Speaker } from "@/types/post";
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

// Generate post URL based on post type
export function getPostUrl(
  slug: string,
  frontmatter?: PostFrontmatter,
): string {
  if (frontmatter?.blogpost === true) {
    return `/blog/${encodeURIComponent(slug)}`;
  }
  return `/presentation/${encodeURIComponent(slug)}`;
}

// Legacy function for backward compatibility
export function getPresentationUrl(slug: string): string {
  return `/presentation/${encodeURIComponent(slug)}`;
}

// Generate blog post URL
export function getBlogUrl(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}`;
}

// Generate announcement URL
export function getAnnouncementUrl(slug: string): string {
  return `/announcement/${encodeURIComponent(slug)}`;
}

// Generate tag URL
export function getTagUrl(tag: string): string {
  // Convert slashes to hyphens to avoid double-encoding issues
  // Then encode the result for URL safety
  // e.g., "CI/CD" → "/tag/ci-cd", "Web Development" → "/tag/web%20development"
  return `/tag/${encodeURIComponent(tag.toLowerCase().replaceAll("/", "-"))}`;
}

// Calculate reading time
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Sanitize input for search (ReDoS-safe implementation)
export function sanitizeSearchInput(input: string): string {
  // Limit input length to prevent ReDoS and resource exhaustion
  const maxInputLength = 200;
  const limitedInput = input.slice(0, maxInputLength);

  return limitedInput
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space (safe pattern)
    .replace(/[<>]/g, ""); // Remove potential HTML brackets
}

// Highlight search terms in text (ReDoS-safe implementation)
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;

  // Limit search term length to prevent ReDoS attacks
  const maxSearchLength = 100;
  const safeTerm = searchTerm.slice(0, maxSearchLength).trim();

  // Escape special regex characters to prevent injection
  const escapedTerm = safeTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Use a simple, non-backtracking regex with word boundaries for safety
  const regex = new RegExp(`\\b(${escapedTerm})\\b`, "gi");

  // Use sanitize-html to ensure the highlighted output is safe
  const highlighted = text.replace(regex, "<mark>$1</mark>");

  return sanitizeHtml(highlighted, {
    allowedTags: ["mark"], // Only allow mark tags for highlighting
    allowedAttributes: {}, // No attributes needed
    disallowedTagsMode: "escape", // Escape any other tags instead of removing
  });
}

// Truncate text to a specific length
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

// Get excerpt from content
export function getExcerpt(content: string, maxLength: number = 160): string {
  // First, sanitize HTML content properly using sanitize-html
  const sanitizedContent = sanitizeHtml(content, {
    allowedTags: [], // Remove all HTML tags
    allowedAttributes: {}, // Remove all attributes
    textFilter: function (text) {
      // Additional text filtering if needed
      return text;
    },
  });

  // Then remove markdown formatting using safe, non-backtracking patterns
  const plainText = sanitizedContent
    .replace(/#{1,6}\s+/g, "") // Remove markdown headers
    .replace(/\*\*[^*]+\*\*/g, (match) => match.slice(2, -2)) // Remove bold, prevent backtracking
    .replace(/\*[^*]+\*/g, (match) => match.slice(1, -1)) // Remove italic, prevent backtracking
    // ReDoS-safe markdown link removal using manual parsing
    .replace(/\[/g, (match, offset, string) => {
      // Find the closing bracket for this opening bracket
      let bracketCount = 1;
      let i = offset + 1;
      let linkText = "";

      // Parse until we find the matching closing bracket
      while (i < string.length && bracketCount > 0) {
        if (string[i] === "[") bracketCount++;
        else if (string[i] === "]") bracketCount--;

        if (bracketCount > 0) linkText += string[i];
        i++;
      }

      // Check if this is followed by a parenthetical URL
      if (bracketCount === 0 && i < string.length && string[i] === "(") {
        // Find the closing parenthesis
        let parenCount = 1;
        i++; // Skip the opening parenthesis

        while (i < string.length && parenCount > 0) {
          if (string[i] === "(") parenCount++;
          else if (string[i] === ")") parenCount--;
          i++;
        }

        // If we found a complete markdown link, return just the text
        if (parenCount === 0) {
          return linkText;
        }
      }

      // If not a complete markdown link, return the original bracket
      return match;
    })
    .replace(/`[^`]*`/g, (match) => match.slice(1, -1)) // Remove inline code backticks, prevent backtracking
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();

  return truncateText(plainText, maxLength);
}

// Get all speakers from a post (unified function for client/server)
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

// Generate speaker URL
export function getSpeakerUrl(speakerName: string): string {
  return `/speaker/${encodeURIComponent(
    speakerName.toLowerCase().replace(/\s+/g, "-"),
  )}`;
}

// Debounce function for search
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Check if a string is a valid email
export function isValidEmail(email: string): boolean {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

// Generate a slug from a string
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}

// Get unique values from an array
export function getUniqueValues<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

// Sort array by property
export function sortByProperty<T>(
  array: T[],
  property: keyof T,
  direction: "asc" | "desc" = "asc",
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[property];
    const bVal = b[property];

    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

// Group array by property
export function groupByProperty<T>(
  array: T[],
  property: keyof T,
): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = String(item[property]);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    },
    {} as Record<string, T[]>,
  );
}
