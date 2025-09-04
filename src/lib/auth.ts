import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
      // Ensure profile image is included in session
      if ((token as { picture?: unknown }).picture && session.user) {
        session.user.image = String((token as { picture?: unknown }).picture);
      }
      return session;
    },
    async jwt({ token, account, profile }) {
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
      return token;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
