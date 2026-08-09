import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  resolveSpeakerRouteContext,
  commitFrontmatterPrChange,
} from "@/lib/linkedin-speaker-pr";
import { getSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";
import {
  getSpeakerLinkedInUrnFromFrontmatter,
  setSpeakerLinkedInUrnInFrontmatter,
} from "@/lib/linkedin-frontmatter";

export const dynamic = "force-dynamic";

// Copies a speaker's already-captured LinkedIn urn (from the Blobs store,
// set by their one-time connect flow) into this post's frontmatter via the
// normal PR-review path, auto-merged - this is a narrow, machine-derived
// metadata sync (not editorial content), so it doesn't need a human review
// step the way a real content edit would. This is the ONLY LinkedIn code
// path that touches the GitHub App's write credentials, and it's
// admin-gated - unlike the public connect flow, which deliberately never
// writes to the repo. Safe to call repeatedly: resolveBranchForEdit reuses
// an existing branch/PR for this post instead of creating a new one each
// time, and if frontmatter already has this exact urn, no PR is opened at
// all.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const context = await resolveSpeakerRouteContext(request, slug);
    if (context instanceof NextResponse) return context;
    const { speakerName, frontmatter, content } = context;

    const urn = await getSpeakerLinkedInUrn(speakerName);
    if (!urn) {
      return NextResponse.json(
        { error: "Speaker has not connected LinkedIn yet" },
        { status: 400 },
      );
    }

    if (
      getSpeakerLinkedInUrnFromFrontmatter(frontmatter, speakerName) === urn
    ) {
      return NextResponse.json({ success: true, alreadyPromoted: true });
    }

    setSpeakerLinkedInUrnInFrontmatter(frontmatter, speakerName, urn);

    // Same fix(blog): <title> convention the post editor uses, so this
    // shows up in changelogs/PR lists the same way - with a suffix so it's
    // clear at a glance this is the LinkedIn sync, not a content edit.
    const { prNumber, isNew, autoMergeEnabled, owner, repo } =
      await commitFrontmatterPrChange({
        slug,
        frontmatter,
        content,
        commitMessageSuffix: " - LinkedIn to frontmatter",
        prTitleSuffix: " - linkedin to frontmatter",
        prBody: `This PR records ${speakerName}'s LinkedIn connection directly in "${
          frontmatter.title || slug
        }"'s frontmatter, so future edits and other tooling can see it without querying the LinkedIn connect store.\n\nTriggered by ${context
          .session.user?.name} from the admin social page.`,
      });

    return NextResponse.json({
      success: true,
      prNumber,
      prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
      isNewPR: isNew,
      autoMergeEnabled,
    });
  } catch (error) {
    console.error("Error promoting speaker's LinkedIn to frontmatter:", error);
    return NextResponse.json(
      { error: "Failed to promote LinkedIn to frontmatter" },
      { status: 500 },
    );
  }
}
