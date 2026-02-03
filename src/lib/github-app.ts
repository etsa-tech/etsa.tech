import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

// Repository configuration
const REPO_OWNER = process.env.GITHUB_OWNER || "etsa";
const REPO_NAME = process.env.GITHUB_REPO || "etsa.tech";

// Connection pool and token management
interface TokenCache {
  token: string;
  expiresAt: Date;
  client: Octokit;
}

let tokenCache: TokenCache | null = null;
let appInstance: App | null = null;
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry

/**
 * Lazily initialize the GitHub App instance
 * This prevents errors during build time when env vars might not be set
 */
function getAppInstance(): App {
  if (!appInstance) {
    if (!process.env.GITHUB_APP_ID) {
      throw new Error("GITHUB_APP_ID environment variable is not set");
    }
    if (!process.env.GITHUB_APP_PRIVATE_KEY) {
      throw new Error("GITHUB_APP_PRIVATE_KEY environment variable is not set");
    }

    appInstance = new App({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
    });
  }
  return appInstance;
}

/**
 * Check if the current token is valid and not expired
 */
function isTokenValid(): boolean {
  if (!tokenCache) return false;

  const now = new Date();
  const expiryWithBuffer = new Date(
    tokenCache.expiresAt.getTime() - TOKEN_REFRESH_BUFFER,
  );

  return now < expiryWithBuffer;
}

/**
 * Create a new installation access token
 */
async function createInstallationToken(): Promise<TokenCache> {
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
      `🔄 Creating new GitHub App token for installation ID: ${installationId}`,
    );
  }

  // Get the app instance and create installation access token
  const app = getAppInstance();
  const { data: installationToken } = await app.octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    {
      installation_id: installationId,
    },
  );

  // Create Octokit client with the new token
  const client = new Octokit({
    auth: installationToken.token,
  });

  const expiresAt = new Date(installationToken.expires_at);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `✅ New GitHub App token created, expires at: ${expiresAt.toISOString()}`,
    );
  }

  return {
    token: installationToken.token,
    expiresAt,
    client,
  };
}

/**
 * Get an authenticated Octokit client using cached token or create new one
 * This implements connection pooling and token reuse for efficiency
 */
export async function getGitHubClient(): Promise<Octokit> {
  try {
    // Return cached client if token is still valid
    if (isTokenValid()) {
      if (process.env.NODE_ENV !== "production") {
        console.log("♻️  Using cached GitHub App client");
      }
      return tokenCache!.client;
    }

    // Create new token and cache it
    tokenCache = await createInstallationToken();
    return tokenCache.client;
  } catch (error) {
    // Clear cache on error to force fresh token on next request
    tokenCache = null;

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
 * Clear the token cache (useful for testing or error recovery)
 */
export function clearTokenCache(): void {
  tokenCache = null;
  if (process.env.NODE_ENV !== "production") {
    console.log("🗑️  GitHub App token cache cleared");
  }
}

/**
 * Get token cache status (for monitoring/debugging)
 */
export function getTokenCacheStatus(): {
  hasToken: boolean;
  expiresAt?: string;
  isValid?: boolean;
} {
  if (!tokenCache) {
    return { hasToken: false };
  }

  return {
    hasToken: true,
    expiresAt: tokenCache.expiresAt.toISOString(),
    isValid: isTokenValid(),
  };
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

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `✅ GitHub App successfully authenticated for ${owner}/${repo}`,
      );
      console.log(`📊 Token cache status:`, getTokenCacheStatus());
    }
    return true;
  } catch (error) {
    // Clear cache on verification failure
    clearTokenCache();

    if (process.env.NODE_ENV !== "production") {
      console.error("❌ GitHub App configuration error:", error);
    }
    return false;
  }
}
