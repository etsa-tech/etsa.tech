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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const slug = formData.get("slug") as string;
    const currentBranch = formData.get("branch") as string;

    if (!file || !slug || !currentBranch) {
      return NextResponse.json(
        { error: "Missing required fields: file, slug, or branch" },
        { status: 400 },
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 50MB." },
        { status: 400 },
      );
    }

    const octokit = await getGitHubClient();
    const { owner, repo } = getRepoInfo();

    // Determine the target branch for the upload
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
            `Creating new update branch for asset upload: ${updateBranchName}`,
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

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Content = buffer.toString("base64");

    // Create the file path
    const filePath = `public/presentation/${slug}/${file.name}`;

    // Check if file already exists on the target branch
    let existingFileSha: string | undefined;
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
        existingFileSha = existingFile.data.sha;
      }
    } catch {
      // File doesn't exist, which is fine
    }

    // Upload the file to GitHub
    const uploadResponse = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Upload asset: ${file.name} for ${slug} [skip ci]

Uploaded via ETSA Admin interface by ${session!.user?.name}.`,
      content: base64Content,
      branch: targetBranch,
      ...(existingFileSha && { sha: existingFileSha }),
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
          `This PR updates the blog post "${postTitle}" by uploading the asset "${
            file.name
          }".\n\nChanges made via ETSA Admin interface by ${session!.user
            ?.name}.`,
        );
        prInfo = { prNumber, isNew, branchName: targetBranch };
      } catch (error) {
        console.error("Failed to create PR:", error);
        // Don't fail the upload if PR creation fails
      }
    }

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        path: filePath,
        url: `/presentation/${slug}/${file.name}`,
        size: file.size,
        sha: uploadResponse.data.content?.sha,
      },
      branch: targetBranch,
      pullRequest: prInfo,
      message: existingFileSha
        ? "File updated successfully"
        : "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading asset:", error);
    return NextResponse.json(
      { error: "Failed to upload asset" },
      { status: 500 },
    );
  }
}
