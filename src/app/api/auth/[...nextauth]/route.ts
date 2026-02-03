import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Force dynamic rendering - this is a serverless function
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
