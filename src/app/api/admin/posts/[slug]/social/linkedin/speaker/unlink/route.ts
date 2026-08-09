import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  getBlogPost,
  createOrUpdateFile,
  createOrGetPullRequest,
  enableAutoMergeForPR,
} from "@/lib/github";
import { getRepoInfo } from "@/lib/github-app";
import { resolveBranchForEdit } from "@/lib/post-branch";
import matter from "gray-matter";
import { load } from "js-yaml";
import { dumpFrontmatterYaml } from "@/lib/yaml-frontmatter";
import { formatBlogPostContent } from "@/lib/server-only-formatter";
import { buildScopedPrTitle, getPostSpeakers } from "@/lib/utils";
import { deleteSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";
import {
  clearSpeakerLinkedInUrnFromFrontmatter,
  getSpeakerLinkedInUrnFromFrontmatter,
} from "@/lib/linkedin-frontmatter";
import type { PostFrontmatter } from "@/types/post";

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
    const session = await getServerSession(authOptions);
    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { speaker: speakerName } = (await request.json()) as {
      speaker?: unknown;
    };
    if (typeof speakerName !== "string" || !speakerName.trim()) {
      return NextResponse.json(
        { error: "Missing speaker name" },
        { status: 400 },
      );
    }

    const rawContent = await getBlogPost(slug, "main");
    // {} bypasses gray-matter's content-keyed parse cache - see the promote
    // route for why mutating a cached frontmatter object is unsafe.
    const { data, content } = matter(rawContent, {});
    const frontmatter = data as PostFrontmatter;

    const speakers = getPostSpeakers(frontmatter);
    const isKnownSpeaker = speakers.some(
      (speaker) => speaker.name.toLowerCase() === speakerName.toLowerCase(),
    );
    if (!isKnownSpeaker) {
      return NextResponse.json(
        { error: "Unknown speaker for this post" },
        { status: 400 },
      );
    }

    await deleteSpeakerLinkedInUrn(speakerName);

    if (!getSpeakerLinkedInUrnFromFrontmatter(frontmatter, speakerName)) {
      return NextResponse.json({ success: true, frontmatterCleared: false });
    }

    clearSpeakerLinkedInUrnFromFrontmatter(frontmatter, speakerName);

    const yamlContent = matter.stringify(content, frontmatter, {
      engines: {
        yaml: {
          parse: (input: string) => load(input) as object,
          stringify: (data: unknown) => dumpFrontmatterYaml(data),
        },
      },
    });
    const fullContent = await formatBlogPostContent(yamlContent);

    const title = frontmatter.title || slug;
    const { branchName, fileSha, sanitizedTitle } = await resolveBranchForEdit(
      slug,
      title,
    );

    await createOrUpdateFile(
      `posts/${slug}.md`,
      fullContent,
      `Update blog post: ${title} - remove LinkedIn from frontmatter`,
      fileSha,
      branchName,
    );

    const { prNumber, isNew } = await createOrGetPullRequest(
      branchName,
      buildScopedPrTitle(
        "fix",
        "blog",
        sanitizedTitle,
        " - remove linkedin from frontmatter",
      ),
      `${speakerName}'s LinkedIn connection was unlinked from the admin social page, so this PR removes the previously-promoted urn from "${title}"'s frontmatter to match.\n\nTriggered by ${session!
        .user?.name} from the admin social page.`,
    );

    const autoMergeEnabled = await enableAutoMergeForPR(prNumber);

    const { owner, repo } = getRepoInfo();

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
