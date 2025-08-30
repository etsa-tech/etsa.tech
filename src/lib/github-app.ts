import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

// GitHub App configuration
const app = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
});

// Repository configuration
const REPO_OWNER = process.env.GITHUB_OWNER || "etsa";
const REPO_NAME = process.env.GITHUB_REPO || "etsa.tech";

/**
 * Get an authenticated Octokit client using GitHub App installation token
 */
export async function getGitHubClient(): Promise<Octokit> {
  try {
    // Validate environment variables
    if (!process.env.GITHUB_APP_ID) {
      throw new Error("GITHUB_APP_ID environment variable is not set");
    }
    if (!process.env.GITHUB_APP_PRIVATE_KEY) {
      throw new Error("GITHUB_APP_PRIVATE_KEY environment variable is not set");
    }
    if (!process.env.GITHUB_APP_INSTALLATION_ID) {
      throw new Error(
        "GITHUB_APP_INSTALLATION_ID environment variable is not set",
      );
    }

    const installationId = parseInt(process.env.GITHUB_APP_INSTALLATION_ID);

    if (isNaN(installationId)) {
      throw new Error(
        `Invalid GITHUB_APP_INSTALLATION_ID: ${process.env.GITHUB_APP_INSTALLATION_ID}`,
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Creating GitHub App client for installation ID: ${installationId}`,
      );
    }

    // Create installation access token manually using the app's octokit
    const { data: installationToken } = await app.octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: installationId,
      },
    );

    // Create a proper Octokit REST client using the token
    const restClient = new Octokit({
      auth: installationToken.token,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ GitHub App client created successfully");
    }
    return restClient;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ Error creating GitHub App client:", error);
      console.error("Environment check:", {
        GITHUB_APP_ID: !!process.env.GITHUB_APP_ID,
        GITHUB_APP_PRIVATE_KEY: !!process.env.GITHUB_APP_PRIVATE_KEY,
        GITHUB_APP_INSTALLATION_ID: process.env.GITHUB_APP_INSTALLATION_ID,
      });
    }
    throw new Error(
      `Failed to authenticate with GitHub App: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Get repository owner and name
 */
export function getRepoInfo() {
  return {
    owner: REPO_OWNER,
    repo: REPO_NAME,
  };
}

/**
 * Verify GitHub App is properly configured
 */
export async function verifyGitHubAppConfig(): Promise<boolean> {
  try {
    const client = await getGitHubClient();
    const { owner, repo } = getRepoInfo();

    // Test access by getting repository info
    await client.rest.repos.get({
      owner,
      repo,
    });

    console.log(
      `✅ GitHub App successfully authenticated for ${owner}/${repo}`,
    );
    return true;
  } catch (error) {
    console.error("❌ GitHub App configuration error:", error);
    return false;
  }
}
