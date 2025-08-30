import { NextResponse } from "next/server";
import { kv } from "@/lib/redis";

export async function GET() {
  try {
    // Test basic Redis operations
    const testKey = `test:${Date.now()}`;
    const testValue = "Hello Redis with TLS!";

    // Test SET
    await kv.set(testKey, testValue, { ex: 60 }); // Expire in 60 seconds

    // Test GET
    const retrievedValue = await kv.get(testKey);

    // Test INCR
    const counterKey = `counter:test:${Date.now()}`;
    const count1 = await kv.incr(counterKey);
    const count2 = await kv.incr(counterKey);

    // Clean up
    await kv.del(testKey);
    await kv.del(counterKey);

    return NextResponse.json({
      success: true,
      message: "Redis connection successful!",
      tests: {
        setGet: {
          set: testValue,
          retrieved: retrievedValue,
          match: testValue === retrievedValue,
        },
        increment: {
          first: count1,
          second: count2,
          working: count1 === 1 && count2 === 2,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Redis test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Redis connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
