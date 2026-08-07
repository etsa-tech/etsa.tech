import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getBlogPost } from "@/lib/github";
import { getSheetRsvpsForEvent } from "@/lib/google-sheets-read";
import matter from "gray-matter";

// Force dynamic rendering - don't try to statically analyze this route
export const dynamic = "force-dynamic";

// Split from the Meetup lookup so the RSVP report page can show independent
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

    const rows = await getSheetRsvpsForEvent(postTitle);

    return NextResponse.json({
      postTitle,
      sheet: {
        rows,
        error:
          rows.length === 0
            ? "No Google Sheet RSVPs found for this event (or the sheet is unreachable)"
            : null,
      },
    });
  } catch (error) {
    console.error("Error building Sheet RSVP report:", error);
    return NextResponse.json(
      { error: "Failed to load Google Sheet RSVPs" },
      { status: 500 },
    );
  }
}
