import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getAllPosts } from "@/lib/blog";
import { getAttendanceRecordByPostSlug } from "@/lib/attendance-store";

// Looks up the attendance record (if any) for a single post, plus that
// post's title/date for display - powers the "Attendance" action linked
// from each row in the admin post list. Saving still goes through the
// generic /api/admin/attendance[/[id]] routes; this is read-only.
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!isAuthorizedUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const post = getAllPosts().find((p) => p.slug === slug);

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const record = await getAttendanceRecordByPostSlug(slug);

  return NextResponse.json({
    postSlug: slug,
    postTitle: post.frontmatter.title,
    postDate: post.frontmatter.date,
    record,
  });
}
