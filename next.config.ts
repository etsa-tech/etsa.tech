import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Strong security headers - complement Netlify headers; used in dev/preview
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS: only enable if you terminate TLS at the edge and serve HTTPS
          // Adjust max-age and includeSubDomains/preload as needed
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Basic CSP - keep aligned with features used (hCaptcha, images, styles)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.hcaptcha.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://hcaptcha.com",
              "frame-src https://hcaptcha.com",
            ].join("; "),
          },
        ],
      },
    ];
  },

  trailingSlash: true,
  images: {
    unoptimized: true,
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
    NEXT_PUBLIC_MEMBER_COUNT: process.env.NEXT_PUBLIC_MEMBER_COUNT,
  },
};

export default nextConfig;
