import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
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
import type { PostFrontmatter } from "@/types/post";

// Shared setup for the LinkedIn promote/unlink routes: both are admin-gated,
// take a `speaker` name in the body, and need that speaker to already be
// listed on the post before touching its frontmatter. Returns a
// NextResponse directly for any of those checks that fail, so callers can
// `if (result instanceof NextResponse) return result;` and otherwise get a
// ready-to-use context.
export async function resolveSpeakerRouteContext(
  request: NextRequest,
  slug: string,
): Promise<
  | NextResponse
  | {
      session: Session;
      speakerName: string;
      frontmatter: PostFrontmatter;
      content: string;
    }
> {
  const session = await getServerSession(authOptions);
  if (!isAuthorizedUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  // mutates the returned frontmatter object in place, and the cache would
  // otherwise hand back (and let us corrupt) the same shared object on a
  // subsequent call with identical raw content.
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

  return { session: session!, speakerName, frontmatter, content };
}

// Commits a frontmatter-only change (already applied to `frontmatter` in
// place) via the normal PR-review path, auto-merged - shared by the
// promote/unlink routes since a urn sync is narrow, machine-derived
// metadata, not editorial content that needs a human review step.
export async function commitFrontmatterPrChange(params: {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
  commitMessageSuffix: string;
  prTitleSuffix: string;
  prBody: string;
}): Promise<{
  prNumber: number;
  isNew: boolean;
  autoMergeEnabled: boolean;
  owner: string;
  repo: string;
}> {
  const {
    slug,
    frontmatter,
    content,
    commitMessageSuffix,
    prTitleSuffix,
    prBody,
  } = params;

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
    `Update blog post: ${title}${commitMessageSuffix}`,
    fileSha,
    branchName,
  );

  const { prNumber, isNew } = await createOrGetPullRequest(
    branchName,
    buildScopedPrTitle("fix", "blog", sanitizedTitle, prTitleSuffix),
    prBody,
  );

  const autoMergeEnabled = await enableAutoMergeForPR(prNumber);
  const { owner, repo } = getRepoInfo();

  return { prNumber, isNew, autoMergeEnabled, owner, repo };
}
