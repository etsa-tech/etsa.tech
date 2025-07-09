// Utility functions that can be used on both client and server
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
  return `/speakers/${encodeURIComponent(slug)}`;
}

// Generate tag URL
export function getTagUrl(tag: string): string {
  return `/tag/${encodeURIComponent(tag.toLowerCase())}`;
}

// Calculate reading time
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Sanitize input for search
export function sanitizeSearchInput(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[<>]/g, ""); // Remove potential HTML brackets
}

// Highlight search terms in text
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  return text.replace(regex, "<mark>$1</mark>");
}

// Truncate text to a specific length
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

// Get excerpt from content
export function getExcerpt(content: string, maxLength: number = 160): string {
  // Remove markdown and HTML using simple regex
  const plainText = content
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/#{1,6}\s+/g, "") // Remove markdown headers
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.*?)\*/g, "$1") // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove markdown links, keep text
    .replace(/`([^`]+)`/g, "$1") // Remove inline code backticks
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();

  return truncateText(plainText, maxLength);
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
