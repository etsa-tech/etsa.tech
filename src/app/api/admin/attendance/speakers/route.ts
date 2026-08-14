import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getAllPosts, getPostSpeakers } from "@/lib/blog";
import { listAttendanceRecords } from "@/lib/attendance-store";
import { computeAttendanceBySpeaker } from "@/lib/attendance-stats";

// Admin-only, like the rest of /api/admin/attendance - joins attendance
// records to posts by slug to attribute headcounts to speakers.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!isAuthorizedUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const records = await listAttendanceRecords();

    const speakerNamesByPostSlug: Record<string, string[]> = {};
    for (const post of getAllPosts()) {
      speakerNamesByPostSlug[post.slug] = getPostSpeakers(post.frontmatter).map(
        (speaker) => speaker.name,
      );
    }

    const speakers = computeAttendanceBySpeaker(
      records,
      speakerNamesByPostSlug,
    );

    return NextResponse.json({ speakers });
  } catch (error) {
    console.error("Error computing attendance by speaker:", error);
    return NextResponse.json(
      { error: "Failed to compute attendance by speaker" },
      { status: 500 },
    );
  }
}
