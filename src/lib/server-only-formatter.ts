import prettier from "prettier";

/**
 * Server-only formatting utilities using Prettier
 * This ensures consistent formatting for all content saved through the admin interface
 */

// Prettier configuration for markdown files
const PRETTIER_CONFIG = {
  parser: "markdown" as const,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed" as const,
  trailingComma: "es5" as const,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always" as const,
  proseWrap: "preserve" as const,
  htmlWhitespaceSensitivity: "css" as const,
  endOfLine: "lf" as const,
};

/**
 * Format markdown content using Prettier
 * @param content - Raw markdown content to format
 * @returns Promise<string> - Formatted markdown content
 */
export async function formatMarkdownContent(content: string): Promise<string> {
  try {
    const formatted = await prettier.format(content, PRETTIER_CONFIG);
    return formatted;
  } catch (error) {
    console.error("Error formatting markdown content:", error);
    // Return original content if formatting fails to avoid breaking saves
    return content;
  }
}

/**
 * Format YAML frontmatter content using Prettier
 * @param yamlContent - Raw YAML content to format
 * @returns Promise<string> - Formatted YAML content
 */
export async function formatYamlContent(yamlContent: string): Promise<string> {
  try {
    const formatted = await prettier.format(yamlContent, {
      parser: "yaml",
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      singleQuote: false,
      trailingComma: "none",
      bracketSpacing: true,
      endOfLine: "lf",
    });
    return formatted;
  } catch (error) {
    console.error("Error formatting YAML content:", error);
    // Return original content if formatting fails
    return yamlContent;
  }
}

/**
 * Format a complete markdown file with frontmatter
 * This function handles the full blog post format with YAML frontmatter + markdown content
 * @param fullContent - Complete file content (frontmatter + markdown)
 * @returns Promise<string> - Formatted complete file content
 */
export async function formatBlogPostContent(
  fullContent: string,
): Promise<string> {
  try {
    // Split the content into frontmatter and markdown sections
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const frontmatterMatch = frontmatterRegex.exec(fullContent);

    if (!frontmatterMatch) {
      // No frontmatter found, just format as markdown
      return await formatMarkdownContent(fullContent);
    }

    const [, frontmatterContent, markdownContent] = frontmatterMatch;

    // Format each section separately
    const formattedFrontmatter = await formatYamlContent(frontmatterContent);
    const formattedMarkdown = await formatMarkdownContent(markdownContent);

    // Reconstruct the file with proper formatting
    // Remove any trailing newlines from frontmatter and ensure single newline separation
    const cleanFrontmatter = formattedFrontmatter.trim();
    const cleanMarkdown = formattedMarkdown.trim();

    return `---\n${cleanFrontmatter}\n---\n\n${cleanMarkdown}\n`;
  } catch (error) {
    console.error("Error formatting blog post content:", error);
    // Return original content if formatting fails
    return fullContent;
  }
}

/**
 * Format JSON content using Prettier
 * @param jsonContent - Raw JSON content to format
 * @returns Promise<string> - Formatted JSON content
 */
export async function formatJsonContent(jsonContent: string): Promise<string> {
  try {
    const formatted = await prettier.format(jsonContent, {
      parser: "json",
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: false,
      trailingComma: "none",
      bracketSpacing: true,
      endOfLine: "lf",
    });
    return formatted;
  } catch (error) {
    console.error("Error formatting JSON content:", error);
    return jsonContent;
  }
}

/**
 * Check if Prettier is available and working
 * @returns Promise<boolean> - True if Prettier is working correctly
 */
export async function isPrettierAvailable(): Promise<boolean> {
  try {
    await prettier.format("# Test", { parser: "markdown" });
    return true;
  } catch (error) {
    console.error("Prettier is not available:", error);
    return false;
  }
}
