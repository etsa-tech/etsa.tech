import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  resolveSpeakerRouteContext,
  commitFrontmatterPrChange,
} from "@/lib/linkedin-speaker-pr";
import { deleteSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";
import {
  clearSpeakerLinkedInUrnFromFrontmatter,
  getSpeakerLinkedInUrnFromFrontmatter,
} from "@/lib/linkedin-frontmatter";

export const dynamic = "force-dynamic";

// Admin-only (unlike the public connect flow) - removing a speaker's
// captured urn reverts future posts back to a plain profile-link mention,
// so it's a board decision, not something the connect link itself exposes.
// If a prior "promote to frontmatter" already copied the urn into this
// post's frontmatter, that copy is now stale - clear it too, via the same
// auto-merged PR path promote uses, so unlinking doesn't leave a dangling
// urn that "promote to frontmatter" would otherwise never revisit.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const context = await resolveSpeakerRouteContext(request, slug);
    if (context instanceof NextResponse) return context;
    const { speakerName, frontmatter, content } = context;

    await deleteSpeakerLinkedInUrn(speakerName);

    if (!getSpeakerLinkedInUrnFromFrontmatter(frontmatter, speakerName)) {
      return NextResponse.json({ success: true, frontmatterCleared: false });
    }

    clearSpeakerLinkedInUrnFromFrontmatter(frontmatter, speakerName);

    const { prNumber, isNew, autoMergeEnabled, owner, repo } =
      await commitFrontmatterPrChange({
        slug,
        frontmatter,
        content,
        commitMessageSuffix: " - remove LinkedIn from frontmatter",
        prTitleSuffix: " - remove linkedin from frontmatter",
        prBody: `${speakerName}'s LinkedIn connection was unlinked from the admin social page, so this PR removes the previously-promoted urn from "${
          frontmatter.title || slug
        }"'s frontmatter to match.\n\nTriggered by ${context.session.user
          ?.name} from the admin social page.`,
      });

    return NextResponse.json({
      success: true,
      frontmatterCleared: true,
      prNumber,
      prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
      isNewPR: isNew,
      autoMergeEnabled,
    });
  } catch (error) {
    console.error("Error unlinking speaker's LinkedIn:", error);
    return NextResponse.json(
      { error: "Failed to unlink LinkedIn" },
      { status: 500 },
    );
  }
}
