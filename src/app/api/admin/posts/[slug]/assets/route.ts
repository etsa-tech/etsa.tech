import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getGitHubClient, getRepoInfo } from "@/lib/github-app";
import {
  createBranch,
  createOrGetPullRequest,
  getBlogPost,
} from "@/lib/github";
import matter from "gray-matter";

// Force dynamic rendering - don't try to statically analyze this route
export const dynamic = "force-dynamic";

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

          // Ensure size is a valid number, default to 0 if not available
          const fileSize =
            typeof file.size === "number" && file.size > 0 ? file.size : 0;

          // Debug logging for file size issues
          if (fileSize === 0) {
            console.log(
              `Asset ${file.name} has size: ${
                file.size
              } (type: ${typeof file.size})`,
            );
          }

          assets.push({
            name: file.name,
            path: file.path,
            url: publicUrl,
            type: fileType,
            size: fileSize,
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");
    const currentBranch = searchParams.get("branch") || "main";

    if (!fileName) {
      return NextResponse.json(
        { error: "Missing fileName parameter" },
        { status: 400 },
      );
    }

    const octokit = await getGitHubClient();
    const { owner, repo } = getRepoInfo();

    // Determine the target branch for the deletion
    let targetBranch = currentBranch;
    let shouldCreatePR = false;

    // If we're on main branch, check for existing update branch or create new one
    if (currentBranch === "main") {
      // Check if there's already an update branch for this post
      const existingBranchPattern = `update-post-${slug}-`;

      try {
        const { data: branches } = await octokit.rest.repos.listBranches({
          owner,
          repo,
        });

        const existingBranch = branches.find((branch) =>
          branch.name.startsWith(existingBranchPattern),
        );

        if (existingBranch) {
          // Use existing branch
          targetBranch = existingBranch.name;
          console.log(`Using existing update branch: ${targetBranch}`);
        } else {
          // Create new branch
          const updateBranchName = `update-post-${slug}-${Date.now()}`;
          console.log(
            `Creating new update branch for asset deletion: ${updateBranchName}`,
          );
          await createBranch(updateBranchName);
          targetBranch = updateBranchName;
          shouldCreatePR = true;
        }
      } catch (error) {
        console.error("Failed to handle branch creation:", error);
        return NextResponse.json(
          { error: "Failed to create or find update branch" },
          { status: 500 },
        );
      }
    }

    // Create the file path
    const filePath = `public/presentation/${slug}/${fileName}`;

    // Get the file to delete (need SHA for deletion)
    let fileSha: string;
    try {
      const existingFile = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: targetBranch,
      });

      if (
        !Array.isArray(existingFile.data) &&
        existingFile.data.type === "file"
      ) {
        fileSha = existingFile.data.sha;
      } else {
        return NextResponse.json(
          { error: "File not found or is not a file" },
          { status: 404 },
        );
      }
    } catch (error) {
      console.error("Error finding file to delete:", error);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete the file from GitHub
    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path: filePath,
      message: `Delete asset: ${fileName} for ${slug} [skip ci]

Deleted via ETSA Admin interface by ${session!.user?.name}.`,
      sha: fileSha,
      branch: targetBranch,
    });

    // Create PR if we created a new branch
    let prInfo = null;
    if (shouldCreatePR) {
      try {
        // Get the blog post title for the PR
        let postTitle = slug;
        try {
          const blogPostContent = await getBlogPost(slug);
          const parsed = matter(blogPostContent);
          postTitle = parsed.data.title || slug;
        } catch {
          // If we can't get the post title, use the slug
        }

        const { prNumber, isNew } = await createOrGetPullRequest(
          targetBranch,
          `Update blog post: ${postTitle}`,
          `This PR updates the blog post "${postTitle}" by deleting the asset "${fileName}".\n\nChanges made via ETSA Admin interface by ${session!
            .user?.name}.`,
        );
        prInfo = { prNumber, isNew, branchName: targetBranch };
      } catch (error) {
        console.error("Failed to create PR:", error);
        // Don't fail the deletion if PR creation fails
      }
    }

    return NextResponse.json({
      success: true,
      file: {
        name: fileName,
        path: filePath,
        deleted: true,
      },
      branch: targetBranch,
      pullRequest: prInfo,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 },
    );
  }
}
