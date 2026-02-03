import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getBlogPosts, getFileContent } from "@/lib/github";
import matter from "gray-matter";

export { dynamic } from "../route-config";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "main";

    const posts = await getBlogPosts(branch);
    console.log(`Admin API: Found ${posts.length} total posts from GitHub`);

    // Filter only .md files
    const markdownPosts = posts.filter((post) => post.name.endsWith(".md"));
    console.log(`Admin API: Found ${markdownPosts.length} markdown posts`);

    // Fetch frontmatter for each post
    const postsWithFrontmatter = await Promise.all(
      markdownPosts.map(async (post) => {
        try {
          const content = await getFileContent(`posts/${post.name}`, branch);
          const { data: frontmatter } = matter(content);

          return {
            ...post,
            frontmatter,
          };
        } catch (error) {
          console.error(`Error fetching frontmatter for ${post.name}:`, error);
          return {
            ...post,
            frontmatter: {},
          };
        }
      }),
    );

    console.log(
      `Admin API: Successfully processed ${postsWithFrontmatter.length} posts with frontmatter`,
    );
    return NextResponse.json({ posts: postsWithFrontmatter });
  } catch (error) {
    console.error("Error fetching posts:", error);

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Detailed error:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      envCheck: {
        GITHUB_APP_ID: !!process.env.GITHUB_APP_ID,
        GITHUB_APP_INSTALLATION_ID: !!process.env.GITHUB_APP_INSTALLATION_ID,
        GITHUB_OWNER: !!process.env.GITHUB_OWNER,
        GITHUB_REPO: !!process.env.GITHUB_REPO,
        GITHUB_APP_PRIVATE_KEY: !!process.env.GITHUB_APP_PRIVATE_KEY,
      },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch posts",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
