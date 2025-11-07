import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations and security
  productionBrowserSourceMaps: false, // Disable source maps in production to prevent code exposure
  poweredByHeader: false, // Remove X-Powered-By header to avoid technology disclosure

  images: {
    unoptimized: true,
    // Allow Google profile images (NextAuth Google provider)
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
    ],
    // Domains list for compatibility with various Next.js behaviors
    domains: [
      "lh3.googleusercontent.com",
      "lh4.googleusercontent.com",
      "lh5.googleusercontent.com",
      "lh6.googleusercontent.com",
    ],
  },
  // Note: Security headers should be implemented at the web server level for static exports
  // Recommended CSP: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.hcaptcha.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; font-src 'self'; connect-src 'self' https://hcaptcha.com; frame-src https://hcaptcha.com"
  env: {
    // ETSA External Links
    NEXT_PUBLIC_GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL,
    NEXT_PUBLIC_LINKEDIN_URL: process.env.NEXT_PUBLIC_LINKEDIN_URL,
    NEXT_PUBLIC_MEETUP_URL: process.env.NEXT_PUBLIC_MEETUP_URL,
    NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL,
    NEXT_PUBLIC_EMAIL: process.env.NEXT_PUBLIC_EMAIL,

    // Organization Details
    NEXT_PUBLIC_ORG_NAME: process.env.NEXT_PUBLIC_ORG_NAME,
    NEXT_PUBLIC_ORG_LOCATION: process.env.NEXT_PUBLIC_ORG_LOCATION,
    NEXT_PUBLIC_ORG_FOUNDED_YEAR: process.env.NEXT_PUBLIC_ORG_FOUNDED_YEAR,
    NEXT_PUBLIC_MEMBER_COUNT: process.env.NEXT_PUBLIC_MEMBER_COUNT,
  },
};

export default nextConfig;
