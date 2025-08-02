import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  createOrUpdateFile,
  createBranch,
  createPullRequest,
} from "@/lib/github";
import matter from "gray-matter";

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
    const fullContent = matter.stringify(content, frontmatter);

    if (createPR) {
      // Create a new branch for the changes
      const branchName = `new-post-${slug}-${Date.now()}`;
      await createBranch(branchName);

      // Create the file in the new branch
      await createOrUpdateFile(
        `posts/${slug}.md`,
        fullContent,
        `Add new blog post: ${frontmatter.title || slug}`,
      );

      // Create pull request
      const prNumber = await createPullRequest(
        branchName,
        `Add new blog post: ${frontmatter.title || slug}`,
        `This PR adds a new blog post "${
          frontmatter.title || slug
        }".\n\nCreated via ETSA Admin interface by ${session!.user
          ?.name} (${session!.user?.email}).`,
      );

      return NextResponse.json({
        success: true,
        message: "Pull request created successfully",
        prNumber,
        branchName,
        slug,
      });
    } else {
      // Direct creation (for drafts or immediate publishing)
      await createOrUpdateFile(
        `posts/${slug}.md`,
        fullContent,
        `Add new blog post: ${frontmatter.title || slug}`,
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
