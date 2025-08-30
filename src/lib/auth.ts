import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: "etsa.tech", // Restrict to etsa.tech Google Workspace domain
        },
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
      if (token.picture && session.user) {
        session.user.image = String(token.picture);
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      // Store the profile picture in the token
      if (
        account?.provider === "google" &&
        profile &&
        "picture" in profile &&
        typeof profile.picture === "string"
      ) {
        token.picture = profile.picture;
      }
      return token;
    },
  },

  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
