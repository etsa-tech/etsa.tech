import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  createOrganizationPost,
  exchangeCodeForToken,
  getLinkedInOrgConfig,
  getSiteOrigin,
  verifyOrganizationAdmin,
} from "@/lib/linkedin/client";
import { verifyState } from "@/lib/linkedin/state";
import { buildDefaultLinkedInCommentary } from "@/lib/linkedin/default-commentary";
import { saveCachedSocialRecord } from "@/lib/social-cache";
import {
  deleteLinkedInPostDraft,
  getLinkedInPostDraft,
} from "@/lib/linkedin-post-draft-store";

export const dynamic = "force-dynamic";

// This path is fixed (not nested under [slug]) because LinkedIn requires
// an exact, pre-registered redirect_uri - a per-post URL would need a
// separate registration for every presentation, which LinkedIn's app
// settings don't support. Which post this is for travels entirely in the
// signed `state` param instead.
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const stateParam = requestUrl.searchParams.get("state");
  const state = stateParam ? verifyState(stateParam) : null;
  const slugForRedirect = state?.purpose === "post" ? state.slug : null;

  // Without a valid state we don't know which post to send the admin back
  // to - fall back to the social provider hub rather than guessing.
  const redirectTo = new URL(
    slugForRedirect ? `/admin/posts/${slugForRedirect}/social` : "/admin/posts",
    request.url,
  );

  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorizedUser(session)) {
      redirectTo.searchParams.set("linkedin_error", "unauthorized");
      return NextResponse.redirect(redirectTo);
    }

    const errorParam = requestUrl.searchParams.get("error");
    if (errorParam) {
      redirectTo.searchParams.set("linkedin_error", errorParam);
      return NextResponse.redirect(redirectTo);
    }

    if (!code || state?.purpose !== "post") {
      redirectTo.searchParams.set("linkedin_error", "invalid_state");
      return NextResponse.redirect(redirectTo);
    }
    const { slug } = state;

    const { clientId, clientSecret, organizationId } = getLinkedInOrgConfig();
    const redirectUri = `${getSiteOrigin()}/api/admin/posts/social/linkedin/callback`;
    const { accessToken } = await exchangeCodeForToken({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });

    const isAdmin = await verifyOrganizationAdmin(accessToken, organizationId);
    if (!isAdmin) {
      redirectTo.searchParams.set("linkedin_error", "not_org_admin");
      return NextResponse.redirect(redirectTo);
    }

    // Use whatever the admin saved in the compose/preview step; only fall
    // back to the auto-generated template if they never touched it.
    const savedDraft = await getLinkedInPostDraft(slug);
    const commentary =
      savedDraft ?? (await buildDefaultLinkedInCommentary(slug));

    const { postUrn, postUrl } = await createOrganizationPost({
      accessToken,
      organizationId,
      commentary,
    });

    await saveCachedSocialRecord(
      slug,
      "linkedin",
      {
        campaignId: postUrn,
        campaignUrl: postUrl,
        status: "sent",
        sentAt: new Date().toISOString(),
        sentBy: session?.user?.email ?? null,
      },
      session?.user?.email ?? null,
    );
    await deleteLinkedInPostDraft(slug);

    redirectTo.searchParams.set("linkedin_success", "1");
    return NextResponse.redirect(redirectTo);
  } catch (error) {
    console.error("Error completing LinkedIn post:", error);
    redirectTo.searchParams.set("linkedin_error", "post_failed");
    return NextResponse.redirect(redirectTo);
  }
}
