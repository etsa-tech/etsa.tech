import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { buildDefaultLinkedInCommentary } from "@/lib/linkedin/default-commentary";
import {
  getLinkedInPostDraft,
  saveLinkedInPostDraft,
} from "@/lib/linkedin-post-draft-store";

export const dynamic = "force-dynamic";

// LinkedIn's own limit on a single post's text.
const MAX_COMMENTARY_LENGTH = 3000;

// Lets the admin preview and edit the LinkedIn post text before it goes
// out. GET returns the saved draft if one exists, otherwise the
// auto-generated template (?fresh=1 always returns the freshly
// auto-generated template, ignoring any saved draft - used by "reset to
// template"). POST saves an edit; the post callback reads it back at
// publish time and falls back to the template if nothing was ever saved.
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
    const forceFresh = request.nextUrl.searchParams.get("fresh") === "1";

    const savedDraft = forceFresh ? null : await getLinkedInPostDraft(slug);
    if (savedDraft) {
      return NextResponse.json({ commentary: savedDraft, isDraft: true });
    }

    const commentary = await buildDefaultLinkedInCommentary(slug);
    return NextResponse.json({ commentary, isDraft: false });
  } catch (error) {
    console.error("Error loading LinkedIn post draft:", error);
    return NextResponse.json(
      { error: "Failed to load LinkedIn post draft" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { commentary } = (await request.json()) as {
      commentary?: unknown;
    };
    if (typeof commentary !== "string" || !commentary.trim()) {
      return NextResponse.json(
        { error: "Post text can't be empty" },
        { status: 400 },
      );
    }
    if (commentary.length > MAX_COMMENTARY_LENGTH) {
      return NextResponse.json(
        {
          error: `Post text exceeds LinkedIn's ${MAX_COMMENTARY_LENGTH}-character limit`,
        },
        { status: 400 },
      );
    }

    await saveLinkedInPostDraft(slug, commentary, session?.user?.email ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving LinkedIn post draft:", error);
    return NextResponse.json(
      { error: "Failed to save LinkedIn post draft" },
      { status: 500 },
    );
  }
}
