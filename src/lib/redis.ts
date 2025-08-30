import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    // Support multiple Redis connection formats
    if (process.env.REDIS_URL) {
      // Full Redis URL format with TLS support
      const redisUrl = process.env.REDIS_URL;
      const useTLS = process.env.REDIS_TLS === "true";

      redis = new Redis(redisUrl, {
        tls: useTLS ? {} : undefined,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    } else {
      // Individual environment variables
      const useTLS = process.env.REDIS_TLS === "true";

      redis = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        tls: useTLS ? {} : undefined,
        // Connection options
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    }

    // Handle connection events
    redis.on("connect", () => {
      console.log("✅ Connected to Redis");
    });

    redis.on("error", (err) => {
      console.error("❌ Redis connection error:", err);
    });

    redis.on("close", () => {
      console.log("🔌 Redis connection closed");
    });
  }

  return redis;
}

// Helper functions that match the Vercel KV API
export const kv = {
  async set(
    key: string,
    value: string,
    options?: { ex?: number },
  ): Promise<string> {
    const client = getRedisClient();
    if (options?.ex) {
      return await client.setex(key, options.ex, value);
    }
    return await client.set(key, value);
  },

  async get(key: string): Promise<string | null> {
    const client = getRedisClient();
    return await client.get(key);
  },

  async incr(key: string): Promise<number> {
    const client = getRedisClient();
    return await client.incr(key);
  },

  async expire(key: string, seconds: number): Promise<number> {
    const client = getRedisClient();
    return await client.expire(key, seconds);
  },

  async zadd(
    key: string,
    scoreMembers: { score: number; member: string },
  ): Promise<number> {
    const client = getRedisClient();
    return await client.zadd(key, scoreMembers.score, scoreMembers.member);
  },

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = getRedisClient();
    return await client.zrange(key, start, stop);
  },

  async del(key: string): Promise<number> {
    const client = getRedisClient();
    return await client.del(key);
  },

  async keys(pattern: string): Promise<string[]> {
    const client = getRedisClient();
    return await client.keys(pattern);
  },
};

// Cleanup function for graceful shutdown
export function closeRedisConnection(): void {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}
