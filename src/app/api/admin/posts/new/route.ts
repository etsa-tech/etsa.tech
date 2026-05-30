import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  createOrUpdateFile,
  createBranch,
  createOrGetPullRequest,
} from "@/lib/github";
import matter from "gray-matter";
import { formatBlogPostContent } from "@/lib/server-only-formatter";
import { sanitizeForBranchName } from "@/lib/utils";

// Force dynamic rendering - don't try to statically analyze this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      slug,
      frontmatter,
      content,
      createPR = true,
    } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Combine frontmatter and content
    // Configure YAML options to force single-line strings (no block scalars)
    const yaml = require("js-yaml");
    const rawContent = matter.stringify(content, frontmatter, {
      engines: {
        yaml: {
          parse: (input: string) => yaml.load(input),
          stringify: (data: unknown) => {
            return yaml.dump(data, {
              lineWidth: -1, // Disable line wrapping
              forceQuotes: true, // Always use quotes for strings
              quotingType: '"', // Use double quotes
              flowLevel: -1, // Use block style for collections, but not scalars
            });
          },
        },
      },
    });

    // Format the content using Prettier for consistent formatting
    const fullContent = await formatBlogPostContent(rawContent);

    if (createPR) {
      // Extract event date and title for branch name and PR title
      // Event date priority: eventDate > date > slug prefix (YYYY-MM-DD)
      const eventDate =
        frontmatter.eventDate ||
        frontmatter.date ||
        slug.split("-").slice(0, 3).join("-");
      const title = frontmatter.title || slug;

      // Create branch name in format: feature/EVENTDATE-EVENTTITLE
      const sanitizedTitle = sanitizeForBranchName(title);
      const branchName = `feature/${eventDate}-${sanitizedTitle}`;

      await createBranch(branchName);

      // Create the file in the new branch
      await createOrUpdateFile(
        `posts/${slug}.md`,
        fullContent,
        `Add new blog post: ${title}`,
        undefined,
        branchName,
      );

      // Create pull request with conventional commit format: feat(blog): EVENTDATE-EVENTTITLE
      const prTitle = `feat(blog): ${eventDate}-${title}`;

      const { prNumber, isNew } = await createOrGetPullRequest(
        branchName,
        prTitle,
        `This PR adds a new blog post "${title}".\n\nCreated via ETSA Admin interface by ${session!
          .user?.name} (${session!.user?.email}).`,
      );

      return NextResponse.json({
        success: true,
        message: "Pull request created successfully",
        prNumber,
        branchName,
        slug,
        isNewPR: isNew,
      });
    } else {
      // Direct creation (for drafts or immediate publishing)
      await createOrUpdateFile(
        `posts/${slug}.md`,
        fullContent,
        `Add new blog post: ${frontmatter.title || slug}`,
        undefined,
        "main",
      );

      return NextResponse.json({
        success: true,
        message: "Post created successfully",
        slug,
      });
    }
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 },
    );
  }
}
