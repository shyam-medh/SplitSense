import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis | null };

// Only initialize Redis if REDIS_URL is explicitly provided.
// This prevents connection hangs on Vercel where localhost:6379 doesn't exist.
export const redis =
  globalForRedis.redis !== undefined
    ? globalForRedis.redis
    : process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) return null; // stop retrying after 3 attempts
          return Math.min(times * 50, 2000);
        }
      })
    : null;

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

/**
 * Helper to cache an async operation.
 * Bypasses cache entirely if Redis is not configured (e.g. on Vercel without Upstash).
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!redis) {
    // Redis is disabled, just return the fresh data
    return await fetcher();
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.warn(`Redis GET error for key ${key}:`, error);
  }

  const freshData = await fetcher();

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(freshData));
  } catch (error) {
    console.warn(`Redis SET error for key ${key}:`, error);
  }

  return freshData;
}
