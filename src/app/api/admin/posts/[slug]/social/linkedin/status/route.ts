import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getCachedSocialRecord } from "@/lib/social-cache";
import {
  getSpeakerLinkedInUrn,
  saveSpeakerLinkedInUrn,
} from "@/lib/speaker-linkedin-store";
import { getBlogPost } from "@/lib/github";
import matter from "gray-matter";
import { getSpeakerLinkedInUrnFromFrontmatter } from "@/lib/linkedin-frontmatter";
import type { PostFrontmatter } from "@/types/post";

export const dynamic = "force-dynamic";

// A speaker's urn can arrive two ways: they complete the OAuth connect flow
// (written straight to the Blobs store), or the urn is already sitting in
// this post's frontmatter (hand-written, or copied from another post). The
// Blobs store is just a cache for reuse across future posts, so if
// frontmatter already has it and the cache doesn't, backfill the cache
// instead of showing "not connected" until someone redoes the OAuth flow.
async function resolveSpeakerUrn(
  slug: string,
  speakerName: string,
): Promise<string | null> {
  const cachedUrn = await getSpeakerLinkedInUrn(speakerName);
  if (cachedUrn) return cachedUrn;

  const rawContent = await getBlogPost(slug, "main");
  const { data } = matter(rawContent);
  const frontmatterUrn = getSpeakerLinkedInUrnFromFrontmatter(
    data as PostFrontmatter,
    speakerName,
  );
  if (!frontmatterUrn) return null;

  await saveSpeakerLinkedInUrn(speakerName, frontmatterUrn, null);
  return frontmatterUrn;
}

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
    const speakerName = request.nextUrl.searchParams.get("speaker")?.trim();

    const [cached, speakerUrn] = await Promise.all([
      getCachedSocialRecord(slug, "linkedin"),
      speakerName
        ? resolveSpeakerUrn(slug, speakerName)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      cached,
      speakerConnected: Boolean(speakerUrn),
      speakerUrn,
    });
  } catch (error) {
    console.error("Error loading LinkedIn status:", error);
    return NextResponse.json(
      { error: "Failed to load LinkedIn status" },
      { status: 500 },
    );
  }
}
