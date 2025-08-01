import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/blog";
import { getPostUrl } from "@/lib/utils";

export async function GET() {
  try {
    const allPosts = getAllPosts();
    const posts = allPosts.slice(0, 10); // Limit to last 10 posts
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://etsa.tech";

    // RSS feed header
    const rssHeader = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ETSA</title>
    <description>Latest presentations and meetups from the ETSA group. Learn from industry experts in systems administration, DevOps, and technology.</description>
    <link>${siteUrl}</link>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <managingEditor>info@etsa.tech (ETSA)</managingEditor>
    <webMaster>info@etsa.tech (ETSA)</webMaster>
    <category>Technology</category>
    <category>Systems Administration</category>
    <category>DevOps</category>
    <ttl>1440</ttl>`;

    // Generate RSS items for each post
    const rssItems = posts
      .map((post) => {
        const { frontmatter, slug } = post;
        const postUrl = `${siteUrl}${getPostUrl(slug)}`;
        const pubDate = new Date(frontmatter.date).toUTCString();

        // Get speaker information for description and author
        let speakerInfo = "";
        let authorName = frontmatter.author || "ETSA";

        if (frontmatter.speakerName) {
          speakerInfo = `Speaker: ${frontmatter.speakerName}`;
          authorName = frontmatter.speakerName;
          if (frontmatter.speakerTitle && frontmatter.speakerCompany) {
            speakerInfo += ` (${frontmatter.speakerTitle} at ${frontmatter.speakerCompany})`;
          }
        } else if (frontmatter.speakers && frontmatter.speakers.length > 0) {
          const speakers = frontmatter.speakers.map((speaker) => {
            let info = speaker.name;
            if (speaker.title && speaker.company) {
              info += ` (${speaker.title} at ${speaker.company})`;
            }
            return info;
          });
          speakerInfo = `Speaker${
            speakers.length > 1 ? "s" : ""
          }: ${speakers.join(", ")}`;
          // Use speaker names as author
          authorName = frontmatter.speakers
            .map((speaker) => speaker.name)
            .join(", ");
        }

        // Create description with excerpt and speaker info
        let description = frontmatter.excerpt;
        if (speakerInfo) {
          description += `\n\n${speakerInfo}`;
        }

        // Add RSVP link
        description += `\n\n\n\nRSVP for upcoming meetings: ${siteUrl}/meeting-info/`;

        // Escape HTML entities in description
        const escapedDescription = description
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

        return `    <item>
      <title><![CDATA[${frontmatter.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${escapedDescription}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>info@etsa.tech (${authorName})</author>
      ${
        frontmatter.tags
          ? frontmatter.tags
              .map((tag) => `<category><![CDATA[${tag}]]></category>`)
              .join("\n      ")
          : ""
      }
    </item>`;
      })
      .join("\n");

    // RSS feed footer
    const rssFooter = `
  </channel>
</rss>`;

    const rssContent = rssHeader + "\n" + rssItems + rssFooter;

    return new NextResponse(rssContent, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return new NextResponse("Error generating RSS feed", { status: 500 });
  }
}
