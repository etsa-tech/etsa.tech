import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getGitHubClient, getRepoInfo } from "@/lib/github-app";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "main";

    const octokit = await getGitHubClient();
    const { owner, repo } = getRepoInfo();

    const assets: Array<{
      name: string;
      path: string;
      url: string;
      type: string;
      size: number;
    }> = [];

    // Simple approach: check the main presentation directory for this slug
    const presentationDir = `public/presentation/${slug}`;

    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: presentationDir,
        ref: branch,
      });

      if (Array.isArray(response.data)) {
        // Filter for files only and process them
        const files = response.data.filter(
          (item: { type: string }) => item.type === "file",
        );

        for (const file of files) {
          const ext = file.name
            .substring(file.name.lastIndexOf("."))
            .toLowerCase();
          const fileType = ext.substring(1).toUpperCase();

          // Create public URL (remove 'public/' prefix)
          const publicUrl = `/${file.path.substring(7)}`;

          assets.push({
            name: file.name,
            path: file.path,
            url: publicUrl,
            type: fileType,
            size: file.size,
          });
        }
      }
    } catch {
      // Directory doesn't exist - that's fine, just return empty assets
      console.log(`No assets found in ${presentationDir} for slug: ${slug}`);
    }

    return NextResponse.json({
      slug,
      assets,
      branch,
      searchedPath: presentationDir,
    });
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  }
}
