/**
 * Token Blocklist Management
 *
 * This module provides server-side token invalidation for JWT-based sessions.
 * When a user logs out, their token identifier (jti) is added to the blocklist,
 * preventing the token from being reused even if it hasn't expired yet.
 *
 * Security Note: This addresses the pen test finding that session cookies
 * remain valid after logout, making the application vulnerable to session
 * replay attacks and man-in-the-middle attacks.
 */

interface BlocklistEntry {
  jti: string;
  expiresAt: number; // Unix timestamp in milliseconds
  email?: string; // For logging/debugging purposes
}

/**
 * In-memory blocklist storage
 *
 * Note: For production environments with multiple server instances,
 * consider using Redis, DynamoDB, or another distributed cache.
 * This in-memory implementation works for single-instance deployments
 * and serverless functions where each request gets a fresh instance.
 */
class TokenBlocklist {
  private readonly blocklist: Map<string, BlocklistEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Start automatic cleanup of expired entries
    this.startCleanup();
  }

  /**
   * Add a token to the blocklist
   * @param jti - JWT ID (unique identifier for the token)
   * @param expiresAt - When the token expires (Unix timestamp in milliseconds)
   * @param email - Optional email for logging purposes
   */
  add(jti: string, expiresAt: number, email?: string): void {
    this.blocklist.set(jti, { jti, expiresAt, email });
    console.log(
      `[TokenBlocklist] Added token to blocklist: ${jti.substring(
        0,
        8,
      )}... (email: ${email || "unknown"})`,
    );
  }

  /**
   * Check if a token is blocklisted
   * @param jti - JWT ID to check
   * @returns true if the token is blocklisted, false otherwise
   */
  isBlocked(jti: string): boolean {
    const entry = this.blocklist.get(jti);
    if (!entry) {
      return false;
    }

    // Check if the entry has expired
    if (Date.now() > entry.expiresAt) {
      // Token has expired naturally, remove from blocklist
      this.blocklist.delete(jti);
      return false;
    }

    return true;
  }

  /**
   * Remove expired entries from the blocklist
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [jti, entry] of this.blocklist.entries()) {
      if (now > entry.expiresAt) {
        this.blocklist.delete(jti);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(
        `[TokenBlocklist] Cleaned up ${removedCount} expired entries. Current size: ${this.blocklist.size}`,
      );
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    // Only start cleanup in Node.js environment (not in browser)
    if (globalThis.window === undefined && !this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, this.CLEANUP_INTERVAL_MS);

      // Don't prevent Node.js from exiting
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Stop automatic cleanup (useful for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get the current size of the blocklist (for monitoring)
   */
  getSize(): number {
    return this.blocklist.size;
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.blocklist.clear();
    console.log("[TokenBlocklist] Cleared all entries");
  }
}

// Singleton instance
const tokenBlocklist = new TokenBlocklist();

export default tokenBlocklist;
