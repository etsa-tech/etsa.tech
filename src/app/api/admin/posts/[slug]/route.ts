import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  getBlogPost,
  getFileContentWithSha,
  createOrUpdateFile,
  createBranch,
  createOrGetPullRequest,
  getBranches,
} from "@/lib/github";
import matter from "gray-matter";
import { formatBlogPostContent } from "@/lib/server-only-formatter";

// Force dynamic rendering - don't try to statically analyze this route
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "main";

    const rawContent = await getBlogPost(slug, branch);
    const { data: frontmatter, content: markdown } = matter(rawContent);

    return NextResponse.json({
      slug,
      frontmatter,
      content: markdown,
      rawContent, // Include raw content for multi-document YAML parsing
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { frontmatter, content, createPR = true } = await request.json();

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "main";

    // Combine frontmatter and content
    const rawContent = matter.stringify(content, frontmatter);

    // Format the content using Prettier for consistent formatting
    const fullContent = await formatBlogPostContent(rawContent);

    if (createPR) {
      // Extract title for branch name and PR title
      const title = frontmatter.title || slug;

      // Check if there's already a branch for this post (support both old and new patterns)
      const allBranches = await getBranches();

      // Old patterns for backward compatibility
      const updateBranchPattern = `update-post-${slug}-`;
      const newPostBranchPattern = `new-post-${slug}-`;

      // Old feature pattern
      const datePrefix = slug.split("-").slice(0, 3).join("-");
      const featureBranchPattern = `feature/${datePrefix}-`;

      // Sanitize title for branch name matching
      // Using non-backtracking approach to prevent ReDoS
      let sanitizedTitle = String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");

      // Trim leading and trailing hyphens safely
      while (sanitizedTitle.startsWith("-")) {
        sanitizedTitle = sanitizedTitle.slice(1);
      }
      while (sanitizedTitle.endsWith("-")) {
        sanitizedTitle = sanitizedTitle.slice(0, -1);
      }

      // New patterns - fix/ and chore/
      const fixBranchPattern = `fix/${sanitizedTitle}`;
      const choreBranchPattern = `chore/${sanitizedTitle}`;

      const existingBranch = allBranches.find(
        (branch) =>
          branch.startsWith(updateBranchPattern) ||
          branch.startsWith(newPostBranchPattern) ||
          branch.startsWith(featureBranchPattern) ||
          branch === fixBranchPattern ||
          branch === choreBranchPattern,
      );

      let branchName: string;
      let fileSha: string;

      if (existingBranch) {
        // Use existing branch
        branchName = existingBranch;
        console.log(`Using existing branch: ${branchName}`);

        // Get the file SHA from the existing branch
        try {
          const fileData = await getFileContentWithSha(
            `posts/${slug}.md`,
            branchName,
          );
          fileSha = fileData.sha;
        } catch {
          // If file doesn't exist in the branch, get SHA from main
          const fileData = await getFileContentWithSha(
            `posts/${slug}.md`,
            "main",
          );
          fileSha = fileData.sha;
        }
      } else {
        // Create a new branch in the format: fix/posttitle
        // Use 'fix' for content corrections/updates
        branchName = `fix/${sanitizedTitle}`;
        console.log(`Creating new fix branch: ${branchName}`);
        await createBranch(branchName);

        // Get the current file SHA from main branch for the update
        const fileData = await getFileContentWithSha(
          `posts/${slug}.md`,
          "main",
        );
        fileSha = fileData.sha;
      }

      // Update the file in the branch
      await createOrUpdateFile(
        `posts/${slug}.md`,
        fullContent,
        `Update blog post: ${title}`,
        fileSha,
        branchName,
      );

      // Create or get existing pull request with conventional commit format
      // Subject is just the title, following conventional commits format
      const prTitle = `fix(blog): ${sanitizedTitle}`;
      const { prNumber, isNew } = await createOrGetPullRequest(
        branchName,
        prTitle,
        `This PR updates the blog post "${title}".\n\nChanges made by ${session!
          .user?.name}.`,
      );

      return NextResponse.json({
        success: true,
        message: isNew
          ? "Pull request created successfully"
          : "Changes saved to existing pull request",
        prNumber,
        branchName,
        isNewPR: isNew,
      });
    } else {
      // Direct update (for drafts or immediate changes) - need SHA for existing file
      try {
        const { sha } = await getFileContentWithSha(`posts/${slug}.md`, branch);
        await createOrUpdateFile(
          `posts/${slug}.md`,
          fullContent,
          `Update blog post: ${frontmatter.title || slug}`,
          sha,
          branch,
        );
      } catch {
        // If file doesn't exist, create it without SHA
        await createOrUpdateFile(
          `posts/${slug}.md`,
          fullContent,
          `Create blog post: ${frontmatter.title || slug}`,
          undefined,
          branch,
        );
      }

      return NextResponse.json({
        success: true,
        message: "Post updated successfully",
      });
    }
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 },
    );
  }
}
