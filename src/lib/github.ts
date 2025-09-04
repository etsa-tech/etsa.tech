import { Octokit } from "@octokit/rest";
import { getGitHubClient, getRepoInfo } from "./github-app";

// Legacy function to get octokit client - now uses GitHub App
async function getOctokit(): Promise<Octokit> {
  return getGitHubClient();
}

// Get repository info from environment
function getRepo() {
  return getRepoInfo();
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  content?: string;
}

export interface BlogPost {
  slug: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

// Get repository contents
export async function getRepoContents(
  path: string = "",
  branch: string = "main",
): Promise<GitHubFile[]> {
  try {
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (Array.isArray(response.data)) {
      return response.data.map((item) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size,
        type: item.type as "file" | "dir",
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching repo contents:", error);
    throw new Error("Failed to fetch repository contents");
  }
}

// Get file content
export async function getFileContent(
  path: string,
  branch: string = "main",
): Promise<string> {
  try {
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if ("content" in response.data) {
      return Buffer.from(response.data.content, "base64").toString("utf-8");
    }

    throw new Error("File content not found");
  } catch (error) {
    console.error("Error fetching file content:", error);
    throw new Error("Failed to fetch file content");
  }
}

// Get file content with SHA (for updates)
export async function getFileContentWithSha(
  path: string,
  branch: string = "main",
): Promise<{ content: string; sha: string }> {
  try {
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if ("content" in response.data) {
      return {
        content: Buffer.from(response.data.content, "base64").toString("utf-8"),
        sha: response.data.sha,
      };
    }

    throw new Error("File content not found");
  } catch (error) {
    console.error("Error fetching file content with SHA:", error);
    throw new Error("Failed to fetch file content with SHA");
  }
}

// Get all blog posts
export async function getBlogPosts(
  branch: string = "main",
): Promise<GitHubFile[]> {
  return getRepoContents("posts", branch);
}

// Get specific blog post
export async function getBlogPost(
  slug: string,
  branch: string = "main",
): Promise<string> {
  return getFileContent(`posts/${slug}.md`, branch);
}

// Get available branches
export async function getBranches(): Promise<string[]> {
  try {
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    const response = await octokit.rest.repos.listBranches({
      owner,
      repo,
    });

    return response.data.map((branch) => branch.name);
  } catch (error) {
    console.error("Error fetching branches:", error);
    return ["main"]; // Fallback to main branch
  }
}

// Create or update file
export async function createOrUpdateFile(
  path: string,
  content: string,
  message: string,
  sha?: string,
  branch?: string,
): Promise<void> {
  try {
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      sha,
      branch,
    });
  } catch (error) {
    console.error("Error creating/updating file:", error);
    throw new Error("Failed to create or update file");
  }
}

// Create branch
export async function createBranch(branchName: string): Promise<void> {
  try {
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    // Get the main branch reference
    const mainBranch = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    });

    // Create new branch
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: mainBranch.data.object.sha,
    });
  } catch (error) {
    console.error("Error creating branch:", error);
    throw new Error("Failed to create branch");
  }
}

// Check if pull request exists for branch
export async function getPullRequestForBranch(
  branchName: string,
): Promise<number | null> {
  try {
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${branchName}`,
      state: "open",
    });

    return response.data.length > 0 ? response.data[0].number : null;
  } catch (error) {
    console.error("Error checking for existing pull request:", error);
    return null;
  }
}

// Get open PR for a specific post (by slug)
export async function getOpenPRForPost(
  slug: string,
): Promise<{ branchName: string; prNumber: number } | null> {
  try {
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
    });

    // Look for PRs with branches that match the post pattern
    const updateBranchPattern = `update-post-${slug}-`;
    const matchingPR = response.data.find((pr) =>
      pr.head.ref.startsWith(updateBranchPattern),
    );

    if (matchingPR) {
      return {
        branchName: matchingPR.head.ref,
        prNumber: matchingPR.number,
      };
    }

    return null;
  } catch (error) {
    console.error("Error checking for open PR for post:", error);
    return null;
  }
}

// Create pull request or return existing one
export async function createOrGetPullRequest(
  branchName: string,
  title: string,
  body: string,
): Promise<{ prNumber: number; isNew: boolean }> {
  try {
    // Check if PR already exists
    const existingPR = await getPullRequestForBranch(branchName);
    if (existingPR) {
      console.log(`Found existing PR #${existingPR} for branch ${branchName}`);
      return { prNumber: existingPR, isNew: false };
    }

    // Create new PR
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    const response = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head: branchName,
      base: "main",
    });

    console.log(
      `Created new PR #${response.data.number} for branch ${branchName}`,
    );
    return { prNumber: response.data.number, isNew: true };
  } catch (error) {
    console.error("Error creating pull request:", error);
    throw new Error("Failed to create pull request");
  }
}

// Create pull request (legacy function for backward compatibility)
export async function createPullRequest(
  branchName: string,
  title: string,
  body: string,
): Promise<number> {
  const result = await createOrGetPullRequest(branchName, title, body);
  return result.prNumber;
}

// Upload asset file
export async function uploadAsset(
  path: string,
  content: Buffer,
  message: string,
): Promise<void> {
  try {
    const octokit = await getOctokit();
    const { owner, repo } = getRepo();

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `public/${path}`,
      message,
      content: content.toString("base64"),
    });
  } catch (error) {
    console.error("Error uploading asset:", error);
    throw new Error("Failed to upload asset");
  }
}
