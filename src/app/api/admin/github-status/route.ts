import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import {
  getTokenCacheStatus,
  verifyGitHubAppConfig,
  clearTokenCache,
  getRepoInfo,
} from "@/lib/github-app";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheStatus = getTokenCacheStatus();
    const { owner, repo } = getRepoInfo();

    // Test connection
    const isConfigValid = await verifyGitHubAppConfig();

    return NextResponse.json({
      status: isConfigValid ? "connected" : "error",
      repository: `${owner}/${repo}`,
      tokenCache: cacheStatus,
      environment: {
        hasAppId: !!process.env.GITHUB_APP_ID,
        hasPrivateKey: !!process.env.GITHUB_APP_PRIVATE_KEY,
        hasInstallationId: !!process.env.GITHUB_APP_INSTALLATION_ID,
        hasOwner: !!process.env.GITHUB_OWNER,
        hasRepo: !!process.env.GITHUB_REPO,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GitHub status check error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    clearTokenCache();

    return NextResponse.json({
      message: "Token cache cleared successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error clearing token cache:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
