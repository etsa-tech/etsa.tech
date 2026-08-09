import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getCachedSocialRecord } from "@/lib/social-cache";
import { getSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";

export const dynamic = "force-dynamic";

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
      speakerName ? getSpeakerLinkedInUrn(speakerName) : Promise.resolve(null),
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
