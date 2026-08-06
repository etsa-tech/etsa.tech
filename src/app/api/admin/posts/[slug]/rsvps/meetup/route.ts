import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getBlogPost } from "@/lib/github";
import { getMeetupRsvpCount, findMeetupEventByTitle } from "@/lib/meetup";
import matter from "gray-matter";

// Force dynamic rendering - don't try to statically analyze this route
export const dynamic = "force-dynamic";

// Split from the Sheet lookup so the RSVP report page can show independent
// per-source loading progress instead of one opaque spinner.
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
    const storedMeetupEventId: string | null =
      frontmatter.meetupEventId || null;

    const meetupResult = storedMeetupEventId
      ? await getMeetupRsvpCount(storedMeetupEventId).then((info) =>
          info
            ? { ...info, id: storedMeetupEventId, matchedByTitle: false }
            : null,
        )
      : await findMeetupEventByTitle(postTitle).then((found) =>
          found ? { ...found, matchedByTitle: true } : null,
        );

    const groupSlug = process.env.MEETUP_GROUP_SLUG;
    const eventUrl = (id: string) =>
      groupSlug ? `https://www.meetup.com/${groupSlug}/events/${id}/` : null;
    const attendeesUrl = (id: string) =>
      groupSlug
        ? `https://www.meetup.com/${groupSlug}/events/${id}/attendees/`
        : null;

    return NextResponse.json({
      postTitle,
      meetup: meetupResult
        ? {
            eventId: meetupResult.id,
            eventUrl: eventUrl(meetupResult.id),
            attendeesUrl: attendeesUrl(meetupResult.id),
            count: meetupResult.count,
            title: meetupResult.title,
            dateTime: meetupResult.dateTime,
            matchedByTitle: meetupResult.matchedByTitle,
            sampleAttendeeNames:
              "sampleAttendeeNames" in meetupResult
                ? meetupResult.sampleAttendeeNames
                : [],
            error: null,
          }
        : {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: storedMeetupEventId
              ? "Meetup data unavailable"
              : "No matching Meetup event found by title (only Meetup's ~10 most recent upcoming/past events are searchable without a stored Meetup Event ID)",
          },
    });
  } catch (error) {
    console.error("Error building Meetup RSVP report:", error);
    return NextResponse.json(
      { error: "Failed to load Meetup RSVPs" },
      { status: 500 },
    );
  }
}
