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
      // Check if there's already an update branch for this post
      const allBranches = await getBranches();
      const updateBranchPattern = `update-post-${slug}-`;
      const existingUpdateBranch = allBranches.find((branch) =>
        branch.startsWith(updateBranchPattern),
      );

      let branchName: string;
      let fileSha: string;

      if (existingUpdateBranch) {
        // Use existing update branch
        branchName = existingUpdateBranch;
        console.log(`Using existing update branch: ${branchName}`);

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
        // Create a new branch for this post
        branchName = `update-post-${slug}-${Date.now()}`;
        console.log(`Creating new update branch: ${branchName}`);
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
        `Update blog post: ${frontmatter.title || slug}`,
        fileSha,
        branchName,
      );

      // Create or get existing pull request
      const { prNumber, isNew } = await createOrGetPullRequest(
        branchName,
        `Update blog post: ${frontmatter.title || slug}`,
        `This PR updates the blog post "${
          frontmatter.title || slug
        }".\n\nChanges made by ${session!.user?.name}.`,
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
