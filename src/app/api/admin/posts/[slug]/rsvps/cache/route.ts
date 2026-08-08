import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getCachedRsvpReport, saveCachedRsvpReport } from "@/lib/rsvp-cache";

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
    const cached = await getCachedRsvpReport(slug);
    return NextResponse.json({ cached });
  } catch (error) {
    console.error("Error loading cached RSVP report:", error);
    return NextResponse.json(
      { error: "Failed to load cached RSVP report" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const data = await request.json();
    const cached = await saveCachedRsvpReport(
      slug,
      data,
      session?.user?.email ?? null,
    );
    return NextResponse.json({ cached });
  } catch (error) {
    console.error("Error saving cached RSVP report:", error);
    return NextResponse.json(
      { error: "Failed to save cached RSVP report" },
      { status: 500 },
    );
  }
}
