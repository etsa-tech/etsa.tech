import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getBlogPost } from "@/lib/github";
import { getSheetRsvpsForEvent } from "@/lib/google-sheets-read";
import { getMeetupRsvpCount } from "@/lib/meetup";
import matter from "gray-matter";

// Force dynamic rendering - don't try to statically analyze this route
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    const rawContent = await getBlogPost(slug, "main");
    const { data: frontmatter } = matter(rawContent);
    const postTitle: string = frontmatter.title || "";
    const meetupEventId: string | null = frontmatter.meetupEventId || null;

    const [sheetRows, meetupInfo] = await Promise.all([
      getSheetRsvpsForEvent(postTitle),
      meetupEventId ? getMeetupRsvpCount(meetupEventId) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      postTitle,
      meetupEventId,
      sheet: {
        rows: sheetRows,
        error:
          sheetRows.length === 0
            ? "No Google Sheet RSVPs found for this event (or the sheet is unreachable)"
            : null,
      },
      meetup: meetupEventId
        ? {
            count: meetupInfo?.count ?? null,
            title: meetupInfo?.title ?? null,
            dateTime: meetupInfo?.dateTime ?? null,
            error: meetupInfo ? null : "Meetup data unavailable",
          }
        : {
            count: null,
            title: null,
            dateTime: null,
            error: "No Meetup Event ID set on this post yet",
          },
    });
  } catch (error) {
    console.error("Error building RSVP report:", error);
    return NextResponse.json(
      { error: "Failed to build RSVP report" },
      { status: 500 },
    );
  }
}
