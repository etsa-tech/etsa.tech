import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/redis";

interface AnalyticsHit {
  page: string;
  timestamp: number;
  domain: string;
  userAgent?: string;
  referrer?: string;
}

export async function POST(request: NextRequest) {
  // Only track in production
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({
      success: true,
      message: "Tracking disabled in development",
    });
  }

  try {
    const { page, domain, userAgent, referrer } = await request.json();

    if (!page || !domain) {
      return NextResponse.json(
        { error: "Missing required fields: page, domain" },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const hour = new Date().getHours();

    const hit: AnalyticsHit = {
      page,
      timestamp,
      domain,
      userAgent,
      referrer,
    };

    // Store individual hit with unique ID
    const hitId = `hit:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(hitId, JSON.stringify(hit), { ex: 365 * 24 * 60 * 60 }); // 1 year expiry

    // Increment daily counters for fast aggregation
    const dailyKey = `daily:${page}:${today}`;
    await kv.incr(dailyKey);
    await kv.expire(dailyKey, 365 * 24 * 60 * 60); // 1 year expiry

    // Increment hourly counters for detailed analytics
    const hourlyKey = `hourly:${page}:${today}:${hour}`;
    await kv.incr(hourlyKey);
    await kv.expire(hourlyKey, 90 * 24 * 60 * 60); // 90 days expiry

    // Increment total counter
    const totalKey = `total:${page}`;
    await kv.incr(totalKey);

    // Store in sorted set for time-series queries
    const timeSeriesKey = `timeseries:${page}`;
    await kv.zadd(timeSeriesKey, { score: timestamp, member: hitId });

    // Domain-specific counters
    const domainKey = `domain:${domain}:${today}`;
    await kv.incr(domainKey);
    await kv.expire(domainKey, 365 * 24 * 60 * 60);

    // Referrer tracking
    if (referrer && referrer !== domain) {
      const referrerKey = `referrer:${page}:${referrer}:${today}`;
      await kv.incr(referrerKey);
      await kv.expire(referrerKey, 90 * 24 * 60 * 60);
    }

    return NextResponse.json({
      success: true,
      message: "Analytics tracked successfully",
      hitId,
    });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track analytics" },
      { status: 500 },
    );
  }
}

// GET endpoint for debugging (admin only)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const days = parseInt(searchParams.get("days") || "7");

    if (!page) {
      return NextResponse.json(
        { error: "Page parameter required" },
        { status: 400 },
      );
    }

    try {
      const results = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dailyKey = `daily:${page}:${dateStr}`;
        const views = (await kv.get(dailyKey)) || 0;
        results.push({
          date: dateStr,
          views: Number(views),
        });
      }

      return NextResponse.json({
        page,
        dailyViews: results.reverse(),
      });
    } catch (error) {
      console.error("Analytics fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "Not available in production" },
    { status: 403 },
  );
}
