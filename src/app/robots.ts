import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://etsa.tech";
  const isProduction = process.env.NODE_ENV === "production";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/_next/",
          "/private/",
          // Block admin routes in production
          ...(isProduction ? ["/admin/*"] : []),
        ],
      },
      // Specific rules for search engines
      {
        userAgent: "Googlebot",
        allow: "/",
        crawlDelay: 1,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        crawlDelay: 1,
      },
      // Block aggressive crawlers
      {
        userAgent: ["AhrefsBot", "MJ12bot", "DotBot"],
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
