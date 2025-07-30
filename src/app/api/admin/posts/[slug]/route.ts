import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBlogPost, getFileContentWithSha, createOrUpdateFile, createBranch, createPullRequest } from "@/lib/github";
import matter from "gray-matter";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email?.endsWith("@etsa.tech")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "main";

    const content = await getBlogPost(slug, branch);
    const { data: frontmatter, content: markdown } = matter(content);

    return NextResponse.json({
      slug,
      frontmatter,
      content: markdown
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email?.endsWith("@etsa.tech")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { frontmatter, content, createPR = true } = await request.json();

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "main";

    // Combine frontmatter and content
    const fullContent = matter.stringify(content, frontmatter);

    if (createPR) {
      // Create a new branch for the changes
      const branchName = `update-post-${slug}-${Date.now()}`;
      await createBranch(branchName);

      // Update the file in the new branch (no SHA needed for new branch)
      await createOrUpdateFile(
        `posts/${slug}.md`,
        fullContent,
        `Update blog post: ${frontmatter.title || slug}`,
        undefined
      );

      // Create pull request
      const prNumber = await createPullRequest(
        branchName,
        `Update blog post: ${frontmatter.title || slug}`,
        `This PR updates the blog post "${frontmatter.title || slug}".\n\nChanges made via ETSA Admin interface by ${session.user.name} (${session.user.email}).`
      );

      return NextResponse.json({ 
        success: true, 
        message: "Pull request created successfully",
        prNumber,
        branchName
      });
    } else {
      // Direct update (for drafts or immediate changes) - need SHA for existing file
      try {
        const { sha } = await getFileContentWithSha(`posts/${slug}.md`, branch);
        await createOrUpdateFile(
          `posts/${slug}.md`,
          fullContent,
          `Update blog post: ${frontmatter.title || slug}`,
          sha
        );
      } catch (error) {
        // If file doesn't exist, create it without SHA
        await createOrUpdateFile(
          `posts/${slug}.md`,
          fullContent,
          `Create blog post: ${frontmatter.title || slug}`
        );
      }

      return NextResponse.json({
        success: true,
        message: "Post updated successfully"
      });
    }
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}
