#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// Directory containing blog posts
const POSTS_DIR = path.join(__dirname, "../posts");

// Function to convert tags from array format to list format
function convertTagsFormat(frontmatter) {
  if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
    // Keep tags as array - YAML dump will format it as list
    return frontmatter.tags;
  }
  return frontmatter.tags;
}

// Function to clean up string values (remove unnecessary quotes)
function cleanStringValue(value) {
  if (typeof value === "string") {
    // Remove quotes if they're not needed
    return value;
  }
  return value;
}

// Function to format frontmatter with consistent schema
function formatFrontmatter(frontmatter) {
  const formatted = {};

  // Order fields consistently
  const fieldOrder = [
    "title",
    "date",
    "excerpt",
    "tags",
    "author",
    "speakers",
    "speakerName",
    "speakerTitle",
    "speakerCompany",
    "speakerBio",
    "speakerImage",
    "speakerLinkedIn",
    "speakerTwitter",
    "speakerGitHub",
    "speakerWebsite",
    "presentationTitle",
    "presentationDescription",
    "presentationSlides",
    "recordingUrl",
    "eventDate",
    "eventLocation",
    "meetingDate",
    "meetingLocation",
    "blogpost",
    "published",
  ];

  // Add fields in order
  for (const field of fieldOrder) {
    if (frontmatter.hasOwnProperty(field)) {
      let value = frontmatter[field];

      // Special handling for different field types
      if (field === "tags") {
        value = convertTagsFormat(frontmatter);
      } else if (typeof value === "string") {
        value = cleanStringValue(value);
      }

      formatted[field] = value;
    }
  }

  // Add any remaining fields not in the order
  for (const [key, value] of Object.entries(frontmatter)) {
    if (!fieldOrder.includes(key)) {
      formatted[key] = value;
    }
  }

  return formatted;
}

// Function to process a single markdown file
function processMarkdownFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");

    // Split frontmatter and content
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      console.log(`⚠️  No frontmatter found in ${filePath}`);
      return;
    }

    const [, frontmatterYaml, markdownContent] = frontmatterMatch;

    // Parse existing frontmatter
    const frontmatter = yaml.load(frontmatterYaml);

    // Format frontmatter with consistent schema
    const formattedFrontmatter = formatFrontmatter(frontmatter);

    // Convert back to YAML with Prettier-style formatting
    const newFrontmatterYaml = yaml.dump(formattedFrontmatter, {
      indent: 2,
      lineWidth: 80,
      noRefs: true,
      sortKeys: false,
      quotingType: '"',
      forceQuotes: false,
      flowLevel: -1,
    });

    // Reconstruct the file
    const newContent = `---\n${newFrontmatterYaml}---\n${markdownContent}`;

    // Write back to file
    fs.writeFileSync(filePath, newContent, "utf8");

    console.log(`✅ Converted ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Main function to process all markdown files
function main() {
  console.log("🔄 Converting YAML schema format for all blog posts...\n");

  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`❌ Posts directory not found: ${POSTS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(POSTS_DIR, file));

  if (files.length === 0) {
    console.log("⚠️  No markdown files found in posts directory");
    return;
  }

  console.log(`📁 Found ${files.length} markdown files to process\n`);

  files.forEach(processMarkdownFile);

  console.log(`\n🎉 Conversion complete! Processed ${files.length} files.`);
  console.log("\n💡 Next steps:");
  console.log("   1. Review the changes with: git diff");
  console.log("   2. Test the website: npm run dev");
  console.log(
    '   3. Commit changes: git add . && git commit -m "Convert YAML schema format"',
  );
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { formatFrontmatter, convertTagsFormat };
