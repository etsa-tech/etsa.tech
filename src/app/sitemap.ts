import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { getPostUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://etsa.tech";
  const posts = getAllPosts();

  // Static pages
  const staticPages = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/presentations`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/speakers`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tags`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/rsvp`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/rss.xml`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/robots.txt`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.1,
    },
    {
      url: `${siteUrl}/humans.txt`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.1,
    },
    {
      url: `${siteUrl}/.well-known/security.txt`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.1,
    },
  ];

  // Dynamic pages for blog posts
  const postPages = posts.map((post) => ({
    url: `${siteUrl}${getPostUrl(post.slug)}`,
    lastModified: new Date(post.frontmatter.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...postPages];
}
