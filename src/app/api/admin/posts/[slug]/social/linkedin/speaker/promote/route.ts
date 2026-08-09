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
import { getSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";
import {
  getSpeakerLinkedInUrnFromFrontmatter,
  setSpeakerLinkedInUrnInFrontmatter,
} from "@/lib/linkedin-frontmatter";
import type { PostFrontmatter } from "@/types/post";

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
    // {} bypasses gray-matter's content-keyed parse cache - this route
    // mutates the returned frontmatter object in place below, and the
    // cache would otherwise hand back (and let us corrupt) the same shared
    // object on a subsequent call with identical raw content.
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
      `Update blog post: ${title} - LinkedIn to frontmatter`,
      fileSha,
      branchName,
    );

    // Same fix(blog): <title> convention the post editor uses, so this
    // shows up in changelogs/PR lists the same way - with a suffix so it's
    // clear at a glance this is the LinkedIn sync, not a content edit.
    const { prNumber, isNew } = await createOrGetPullRequest(
      branchName,
      buildScopedPrTitle(
        "fix",
        "blog",
        sanitizedTitle,
        " - linkedin to frontmatter",
      ),
      `This PR records ${speakerName}'s LinkedIn connection directly in "${title}"'s frontmatter, so future edits and other tooling can see it without querying the LinkedIn connect store.\n\nTriggered by ${session!
        .user?.name} from the admin social page.`,
    );

    const autoMergeEnabled = await enableAutoMergeForPR(prNumber);

    const { owner, repo } = getRepoInfo();

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
