import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getAllPosts } from "@/lib/blog";

// Lightweight post picker for the attendance form's post-slug dropdown.
// Reads posts from the local filesystem (like getAllPosts everywhere else
// on the public site) instead of the GitHub-backed /api/admin/posts, which
// fetches every post's file content over the GitHub API for branch editing -
// far more than a slug/title/date picker needs.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!isAuthorizedUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = getAllPosts().map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title,
    date: post.frontmatter.date,
  }));

  return NextResponse.json({ posts });
}
