import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getLinkedInSpeakerConfig,
  getMemberSub,
  getSiteOrigin,
} from "@/lib/linkedin/client";
import { verifyState } from "@/lib/linkedin/state";
import { saveSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";

export const dynamic = "force-dynamic";

// Fixed path for the same reason as the post callback - LinkedIn's redirect
// URLs must be exact and pre-registered, so the post slug travels in the
// signed `state` param instead of the URL path. Deliberately unauthenticated
// (see the authorize route) - lands on the public /linkedin-connected page
// rather than the admin console, since the speaker completing this can't
// sign into /admin.
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const redirectTo = new URL("/linkedin-connected", request.url);

  try {
    const errorParam = requestUrl.searchParams.get("error");
    if (errorParam) {
      redirectTo.searchParams.set("status", "error");
      redirectTo.searchParams.set("error", errorParam);
      return NextResponse.redirect(redirectTo);
    }

    const code = requestUrl.searchParams.get("code");
    const stateParam = requestUrl.searchParams.get("state");
    const state = stateParam ? verifyState(stateParam) : null;
    if (!code || state?.purpose !== "speaker-connect") {
      redirectTo.searchParams.set("status", "error");
      redirectTo.searchParams.set("error", "invalid_state");
      return NextResponse.redirect(redirectTo);
    }

    const { clientId, clientSecret } = getLinkedInSpeakerConfig();
    const redirectUri = `${getSiteOrigin()}/api/posts/social/linkedin/speaker/callback`;
    const { accessToken } = await exchangeCodeForToken({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });

    const sub = await getMemberSub(accessToken);
    // No admin session exists in this flow by design - the speaker
    // completes this themselves, so there's no board-member identity to
    // record as the connector.
    await saveSpeakerLinkedInUrn(state.speakerName, sub, null);

    redirectTo.searchParams.set("status", "success");
    redirectTo.searchParams.set("speaker", state.speakerName);
    return NextResponse.redirect(redirectTo);
  } catch (error) {
    console.error("Error completing LinkedIn speaker connect:", error);
    redirectTo.searchParams.set("status", "error");
    redirectTo.searchParams.set("error", "connect_failed");
    return NextResponse.redirect(redirectTo);
  }
}
