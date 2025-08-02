import { Session } from "next-auth";

/**
 * Check if a user session is authorized for admin access
 * @param session - The NextAuth session object
 * @returns boolean - true if user is authorized (has @etsa.tech email), false otherwise
 */
export function isAuthorizedUser(session: Session | null): boolean {
  return Boolean(session?.user?.email?.endsWith("@etsa.tech"));
}

/**
 * Check if a user session is authorized and throw an error if not
 * @param session - The NextAuth session object
 * @throws Error if user is not authorized
 */
export function requireAuthorizedUser(session: Session | null): void {
  if (!isAuthorizedUser(session)) {
    throw new Error("Unauthorized: User must have @etsa.tech email");
  }
}
