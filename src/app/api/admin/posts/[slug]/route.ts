import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  getBlogPost,
  getFileContentWithSha,
  createOrUpdateFile,
  createOrGetPullRequest,
  enableAutoMergeForPR,
} from "@/lib/github";
import { getRepoInfo } from "@/lib/github-app";
import matter from "gray-matter";
import { load } from "js-yaml";
import { dumpFrontmatterYaml } from "@/lib/yaml-frontmatter";
import { formatBlogPostContent } from "@/lib/server-only-formatter";
import { resolveBranchForEdit } from "@/lib/post-branch";

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
    const {
      frontmatter,
      content,
      createPR = true,
      autoMerge = false,
    } = await request.json();

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "main";

    // Combine frontmatter and content
    // Configure YAML options to force single-line strings (no block scalars)
    const rawContent = matter.stringify(content, frontmatter, {
      engines: {
        yaml: {
          parse: (input: string) => load(input) as object,
          stringify: (data: unknown) => dumpFrontmatterYaml(data),
        },
      },
    });

    // Format the content using Prettier for consistent formatting
    const fullContent = await formatBlogPostContent(rawContent);

    if (createPR) {
      // Extract title for branch name and PR title
      const title = frontmatter.title || slug;

      const { branchName, fileSha, sanitizedTitle } =
        await resolveBranchForEdit(slug, title);

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

      const { owner, repo } = getRepoInfo();

      // Auto-merge is opt-in per call site, not a general PUT behavior - only
      // the RSVP report's "save Meetup Event ID" flow sets this, since it's
      // a narrow metadata-only change. The route's own auth check above
      // (isAuthorizedUser - @etsa.tech accounts only) is what "the user
      // matches" gates on; there's no separate per-PR-type permission model.
      const autoMergeEnabled = autoMerge
        ? await enableAutoMergeForPR(prNumber)
        : false;

      return NextResponse.json({
        success: true,
        message: isNew
          ? "Pull request created successfully"
          : "Changes saved to existing pull request",
        prNumber,
        prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
        branchName,
        isNewPR: isNew,
        autoMergeEnabled,
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
