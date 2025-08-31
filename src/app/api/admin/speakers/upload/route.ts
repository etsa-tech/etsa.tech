import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getGitHubClient, getRepoInfo } from "@/lib/github-app";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Missing required field: file" },
        { status: 400 },
      );
    }

    // Validate file type (images only)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB for images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    const octokit = await getGitHubClient();
    const { owner, repo } = getRepoInfo();

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Content = buffer.toString("base64");

    // Create the file path in /public/images/speakers/
    const filePath = `public/images/speakers/${file.name}`;

    // Check if file already exists
    let existingFileSha: string | undefined;
    try {
      const existingFile = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: "main",
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
      message: `Upload speaker image: ${file.name} [skip ci]

Uploaded via ETSA Admin interface by ${session!.user?.name}.`,
      content: base64Content,
      branch: "main",
      ...(existingFileSha && { sha: existingFileSha }),
    });

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        path: filePath,
        url: `/images/speakers/${file.name}`,
        size: file.size,
        sha: uploadResponse.data.content?.sha,
      },
      message: existingFileSha
        ? "Speaker image updated successfully"
        : "Speaker image uploaded successfully",
    });
  } catch (error) {
    console.error("Speaker upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload speaker image" },
      { status: 500 },
    );
  }
}
