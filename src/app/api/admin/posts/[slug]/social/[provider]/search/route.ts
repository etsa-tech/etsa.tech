import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getProvider } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; provider: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider: providerName } = await params;
    const provider = getProvider(providerName);
    if (!provider) {
      return NextResponse.json(
        { error: `Unknown social provider: ${providerName}` },
        { status: 404 },
      );
    }

    const query = request.nextUrl.searchParams.get("q")?.trim();
    if (!query) {
      return NextResponse.json({ contacts: [] });
    }

    const contacts = await provider.searchContacts(query);
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Error searching social contacts:", error);
    return NextResponse.json(
      { error: "Failed to search contacts" },
      { status: 500 },
    );
  }
}
