import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Note: Security headers should be implemented at the web server level for static exports
  // Recommended CSP: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.hcaptcha.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://hcaptcha.com; frame-src https://hcaptcha.com"
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
  },
};

export default nextConfig;
