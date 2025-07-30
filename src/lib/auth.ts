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
    async signIn({ user, account, profile }) {
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
      // Add any additional session data here
      return session;
    },
    async jwt({ token, user, account }) {
      // Add any additional token data here
      return token;
    },
  },

  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
