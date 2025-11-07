import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { randomBytes } from "node:crypto";
import tokenBlocklist from "./token-blocklist";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          hd: "etsa.tech", // Restrict to etsa.tech Google Workspace domain
        },
      },
      // Map Google's OIDC fields -> NextAuth user fields so user.image is present
      profile(profile: {
        sub: string;
        name?: string;
        email?: string;
        picture?: string;
      }) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Additional check to ensure user is from etsa.tech domain
      if (account?.provider === "google") {
        const email = user.email;
        if (!email?.endsWith("@etsa.tech")) {
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      // Check for session timeout due to inactivity (24 hours)
      const lastActivity = (token as { lastActivity?: number }).lastActivity;
      const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        console.log(
          `[Auth] Session expired due to inactivity: ${session.user?.email || "unknown"}`,
        );
        // Invalidate the token
        const jti = (token as { jti?: string }).jti;
        if (jti) {
          const blocklistDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
          const expiresAt = Date.now() + blocklistDuration;
          tokenBlocklist.add(jti, expiresAt, session.user?.email || undefined);
        }
        // Return null to force re-authentication
        throw new Error("Session expired due to inactivity");
      }

      // Ensure profile image is included in session
      if ((token as { picture?: unknown }).picture && session.user) {
        session.user.image = String((token as { picture?: unknown }).picture);
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      // Generate a unique token ID (jti) on first sign-in
      if (account?.provider === "google" && !token.jti) {
        (token as { jti?: string }).jti = randomBytes(32).toString("hex");
      }

      // Check if token is blocklisted (invalidated on logout)
      const jti = (token as { jti?: string }).jti;
      if (jti && tokenBlocklist.isBlocked(jti)) {
        console.log(
          `[Auth] Blocked access attempt with invalidated token: ${jti.substring(0, 8)}...`,
        );
        // Return an empty token to force re-authentication
        return {};
      }

      // Store the profile picture in the token
      if (
        account?.provider === "google" &&
        profile &&
        "picture" in profile &&
        typeof (profile as { picture?: unknown }).picture === "string"
      ) {
        (token as { picture?: string }).picture = (
          profile as { picture: string }
        ).picture;
      }

      // Track last activity time for session timeout
      (token as { lastActivity?: number }).lastActivity = Date.now();

      return token;
    },
  },
  events: {
    async signOut({ token }) {
      // Add token to blocklist when user signs out
      const jti = (token as { jti?: string }).jti;
      const email = (token as { email?: string }).email;

      if (jti) {
        // Keep token on blocklist for 7 days to prevent replay attacks
        const blocklistDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        const expiresAt = Date.now() + blocklistDuration;

        tokenBlocklist.add(jti, expiresAt, email);
        console.log(
          `[Auth] User signed out, token invalidated: ${email || "unknown"}`,
        );
      } else {
        console.warn("[Auth] Sign out event triggered but no jti found in token");
      }
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
