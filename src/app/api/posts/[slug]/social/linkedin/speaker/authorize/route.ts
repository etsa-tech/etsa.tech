import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  getLinkedInSpeakerConfig,
  getSiteOrigin,
} from "@/lib/linkedin/client";
import { signState } from "@/lib/linkedin/state";
import { getPublishedPostFrontmatter } from "@/lib/social/post-data";
import { getPostSpeakers } from "@/lib/utils";

export const dynamic = "force-dynamic";

// One-time per speaker: they authorize with their own LinkedIn login so we
// can capture their member id (via the OIDC userinfo `sub`) for real,
// notifying @mentions on future posts. Deliberately unauthenticated - this
// link is meant to be sent directly to the speaker, who isn't an ETSA admin
// and can't sign into /admin. Scoped to a speaker already listed on this
// post (public info on the post itself), so it can't be used to attach an
// arbitrary URN to an arbitrary name.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const speakerName = request.nextUrl.searchParams.get("speaker")?.trim();
    if (!speakerName) {
      return NextResponse.redirect(
        new URL(
          "/linkedin-connected?status=error&error=missing_speaker",
          request.url,
        ),
      );
    }

    const frontmatter = await getPublishedPostFrontmatter(slug);
    const speakers = getPostSpeakers(frontmatter);
    const isKnownSpeaker = speakers.some(
      (speaker) => speaker.name.toLowerCase() === speakerName.toLowerCase(),
    );
    if (!isKnownSpeaker) {
      return NextResponse.redirect(
        new URL(
          "/linkedin-connected?status=error&error=unknown_speaker",
          request.url,
        ),
      );
    }

    const { clientId } = getLinkedInSpeakerConfig();
    // Fixed, pre-registered path - see the post authorize route for why.
    const redirectUri = `${getSiteOrigin()}/api/posts/social/linkedin/speaker/callback`;
    const state = signState({ purpose: "speaker-connect", slug, speakerName });

    const authorizeUrl = buildAuthorizeUrl({
      clientId,
      redirectUri,
      state,
      scope: "openid profile",
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error("Error starting LinkedIn speaker connect:", error);
    return NextResponse.redirect(
      new URL(
        "/linkedin-connected?status=error&error=start_failed",
        request.url,
      ),
    );
  }
}
