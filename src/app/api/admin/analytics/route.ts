import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { kv } from "@/lib/redis";
import { getBlogPosts, getFileContent } from "@/lib/github";
import matter from "gray-matter";

interface AnalyticsData {
  totalViews: number;
  dailyViews: Array<{ date: string; views: number }>;
  hourlyViews: Array<{ hour: number; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  posts: Array<{
    slug: string;
    title: string;
    totalViews: number;
    dailyViews: Array<{ date: string; views: number }>;
    lastViewed?: string;
  }>;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalPosts: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const page = searchParams.get("page"); // Optional: specific page analytics
    const currentPage = parseInt(searchParams.get("currentPage") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    if (page) {
      // Get analytics for specific page
      return getPageAnalytics(page, days);
    }

    // Get overall analytics with pagination
    const analytics = await getOverallAnalytics(days, currentPage, pageSize);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}

async function getPageAnalytics(page: string, days: number) {
  const dailyViews = [];
  const hourlyViews = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    views: 0,
  }));

  // Get daily views
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dailyKey = `daily:${page}:${dateStr}`;
    const views = (await kv.get(dailyKey)) || 0;
    dailyViews.push({
      date: dateStr,
      views: Number(views),
    });
  }

  // Get hourly views for today
  const today = new Date().toISOString().split("T")[0];
  for (let hour = 0; hour < 24; hour++) {
    const hourlyKey = `hourly:${page}:${today}:${hour}`;
    const views = (await kv.get(hourlyKey)) || 0;
    hourlyViews[hour].views = Number(views);
  }

  // Get total views
  const totalKey = `total:${page}`;
  const totalViews = (await kv.get(totalKey)) || 0;

  return NextResponse.json({
    page,
    totalViews: Number(totalViews),
    dailyViews: dailyViews.reverse(),
    hourlyViews,
  });
}

async function getOverallAnalytics(
  days: number,
  currentPage: number = 1,
  pageSize: number = 10,
): Promise<AnalyticsData> {
  // Get all blog posts with frontmatter (reuse the same logic as the posts API)
  const blogPosts = await getBlogPosts();
  const allPosts = [];
  let totalViews = 0;

  // Aggregate daily views across all posts
  const aggregatedDailyViews = new Map<string, number>();

  // Get posts with frontmatter in batch (same as posts API)
  const postsWithFrontmatter = [];
  for (const post of blogPosts.filter((post) => post.name.endsWith(".md"))) {
    try {
      const content = await getFileContent(post.path);
      const { data: frontmatter } = matter(content);
      postsWithFrontmatter.push({
        ...post,
        frontmatter,
      });
    } catch (error) {
      console.error(`Error processing post ${post.name}:`, error);
    }
  }

  for (const post of postsWithFrontmatter) {
    const slug = post.name.replace(".md", "");
    const postPath = `/blog/${slug}`;
    const title = post.frontmatter.title || slug;

    // Get total views for this post
    const totalKey = `total:${postPath}`;
    const postTotalViews = Number((await kv.get(totalKey)) || 0);
    totalViews += postTotalViews;

    // Get daily views for this post
    const postDailyViews = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dailyKey = `daily:${postPath}:${dateStr}`;
      const views = Number((await kv.get(dailyKey)) || 0);

      postDailyViews.push({
        date: dateStr,
        views,
      });

      // Aggregate for overall daily views
      const currentTotal = aggregatedDailyViews.get(dateStr) || 0;
      aggregatedDailyViews.set(dateStr, currentTotal + views);
    }

    allPosts.push({
      slug,
      title,
      totalViews: postTotalViews,
      dailyViews: postDailyViews.reverse(),
    });
  }

  // Convert aggregated daily views to array
  const dailyViews = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    dailyViews.push({
      date: dateStr,
      views: aggregatedDailyViews.get(dateStr) || 0,
    });
  }

  // Get top referrers (simplified - could be expanded)
  const topReferrers: Array<{ referrer: string; views: number }> = []; // TODO: Implement referrer aggregation

  // Sort all posts by total views
  allPosts.sort((a, b) => b.totalViews - a.totalViews);

  // Apply pagination
  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPosts = allPosts.slice(startIndex, endIndex);

  return {
    totalViews,
    dailyViews: dailyViews.reverse(),
    hourlyViews: [], // TODO: Implement hourly aggregation
    topReferrers,
    posts: paginatedPosts,
    pagination: {
      currentPage,
      pageSize,
      totalPosts,
      totalPages,
    },
  };
}
