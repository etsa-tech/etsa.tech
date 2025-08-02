import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getBranches } from "@/lib/github";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branches = await getBranches();
    return NextResponse.json({ branches });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 },
    );
  }
}
