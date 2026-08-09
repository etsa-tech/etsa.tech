import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  buildAuthorizeUrl,
  getLinkedInOrgConfig,
  getSiteOrigin,
} from "@/lib/linkedin/client";
import { signState } from "@/lib/linkedin/state";

export const dynamic = "force-dynamic";

// Starts the per-post LinkedIn posting flow: whichever board member is
// signed into LinkedIn in this browser authorizes this specific post. No
// token is ever persisted - the callback route uses it once and discards it.
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
    const { clientId } = getLinkedInOrgConfig();
    // Fixed, pre-registered path - LinkedIn requires an exact redirect_uri
    // match, so the slug travels in `state` rather than this URL.
    const redirectUri = `${getSiteOrigin()}/api/admin/posts/social/linkedin/callback`;
    const state = signState({ purpose: "post", slug });

    const authorizeUrl = buildAuthorizeUrl({
      clientId,
      redirectUri,
      state,
      scope: "w_organization_social",
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error("Error starting LinkedIn authorization:", error);
    return NextResponse.json(
      { error: "Failed to start LinkedIn authorization" },
      { status: 500 },
    );
  }
}
