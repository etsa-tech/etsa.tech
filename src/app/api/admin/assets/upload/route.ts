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
      try {
        // Get the blog post to extract title for branch naming
        const blogPostContent = await getBlogPost(slug);
        const parsed = matter(blogPostContent);
        const title = parsed.data.title || slug;

        // Check if there's already a branch for this post (support both old and new patterns)
        const { data: branches } = await octokit.rest.repos.listBranches({
          owner,
          repo,
        });

        // Old patterns for backward compatibility
        const updateBranchPattern = `update-post-${slug}-`;
        const newPostBranchPattern = `new-post-${slug}-`;

        // Old feature pattern
        const datePrefix = slug.split("-").slice(0, 3).join("-");
        const featureBranchPattern = `feature/${datePrefix}-`;

        // Sanitize title for branch name matching
        const sanitizedTitle = String(title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        // New patterns - fix/ and chore/
        const fixBranchPattern = `fix/${sanitizedTitle}`;
        const choreBranchPattern = `chore/${sanitizedTitle}`;

        const existingBranch = branches.find(
          (branch) =>
            branch.name.startsWith(updateBranchPattern) ||
            branch.name.startsWith(newPostBranchPattern) ||
            branch.name.startsWith(featureBranchPattern) ||
            branch.name === fixBranchPattern ||
            branch.name === choreBranchPattern,
        );

        if (existingBranch) {
          // Use existing branch
          targetBranch = existingBranch.name;
          console.log(`Using existing branch: ${targetBranch}`);
        } else {
          // Create new branch in the format: fix/posttitle
          const updateBranchName = `fix/${sanitizedTitle}`;
          console.log(
            `Creating new fix branch for asset upload: ${updateBranchName}`,
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
        // Get the blog post info for the PR title
        let postTitle = slug;
        try {
          const blogPostContent = await getBlogPost(slug);
          const parsed = matter(blogPostContent);
          postTitle = parsed.data.title || slug;
        } catch {
          // If we can't get the post info, use the slug
        }

        // Sanitize title for PR subject
        const sanitizedTitle = String(postTitle)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        // Use conventional commit format for PR title
        // Subject is just the title, following conventional commits format
        const prTitle = `fix(blog): ${sanitizedTitle}`;
        const { prNumber, isNew } = await createOrGetPullRequest(
          targetBranch,
          prTitle,
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
