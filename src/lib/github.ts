import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const REPO_OWNER = "etsa-tech";
const REPO_NAME = "etsa.tech";

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
  frontmatter: Record<string, any>;
}

// Get repository contents
export async function getRepoContents(path: string = "", branch: string = "main"): Promise<GitHubFile[]> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
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
export async function getFileContent(path: string, branch: string = "main"): Promise<string> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
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
export async function getFileContentWithSha(path: string, branch: string = "main"): Promise<{ content: string; sha: string }> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
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
export async function getBlogPosts(branch: string = "main"): Promise<GitHubFile[]> {
  return getRepoContents("posts", branch);
}

// Get specific blog post
export async function getBlogPost(slug: string, branch: string = "main"): Promise<string> {
  return getFileContent(`posts/${slug}.md`, branch);
}

// Get available branches
export async function getBranches(): Promise<string[]> {
  try {
    const response = await octokit.rest.repos.listBranches({
      owner: REPO_OWNER,
      repo: REPO_NAME,
    });

    return response.data.map(branch => branch.name);
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
  sha?: string
): Promise<void> {
  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      sha,
    });
  } catch (error) {
    console.error("Error creating/updating file:", error);
    throw new Error("Failed to create or update file");
  }
}

// Create branch
export async function createBranch(branchName: string): Promise<void> {
  try {
    // Get the main branch reference
    const mainBranch = await octokit.rest.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: "heads/main",
    });

    // Create new branch
    await octokit.rest.git.createRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: mainBranch.data.object.sha,
    });
  } catch (error) {
    console.error("Error creating branch:", error);
    throw new Error("Failed to create branch");
  }
}

// Create pull request
export async function createPullRequest(
  branchName: string,
  title: string,
  body: string
): Promise<number> {
  try {
    const response = await octokit.rest.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title,
      body,
      head: branchName,
      base: "main",
    });

    return response.data.number;
  } catch (error) {
    console.error("Error creating pull request:", error);
    throw new Error("Failed to create pull request");
  }
}

// Upload asset file
export async function uploadAsset(
  path: string,
  content: Buffer,
  message: string
): Promise<void> {
  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `public/${path}`,
      message,
      content: content.toString("base64"),
    });
  } catch (error) {
    console.error("Error uploading asset:", error);
    throw new Error("Failed to upload asset");
  }
}
