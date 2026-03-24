import redis from './redis';
import { createHash } from 'crypto';

/**
 * Generate a stable cache key from a base prefix and optional params object.
 * e.g. cacheKey('farmers', { page: 1, search: 'john' }) => 'fims:v1:farmers:a3f9...'
 */
export function cacheKey(resource: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) {
    return `fims:v1:${resource}`;
  }
  const hash = createHash('md5')
    .update(JSON.stringify(params))
    .digest('hex')
    .slice(0, 12);
  return `fims:v1:${resource}:${hash}`;
}

/**
 * Attempt to read from cache; on miss run the fetch function, store result, and return it.
 * Falls back gracefully to calling fn() directly if Redis is unavailable.
 */
export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch {
    // Redis unavailable — run without cache
    return fn();
  }

  const result = await fn();

  try {
    await redis.set(key, result, { ex: ttlSeconds });
  } catch {
    // Ignore cache write failures — data is still served correctly
  }

  return result;
}

/**
 * Delete all keys matching a given prefix pattern.
 * Uses SCAN to avoid blocking the Redis server with KEYS.
 * Pass the base prefix, e.g. 'fims:v1:farmers'
 */
export async function invalidateByPrefix(prefix: string): Promise<void> {
  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: `${prefix}*`,
        count: 100,
      });
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        await redis.del(...(keys as [string, ...string[]]));
      }
    } while (cursor !== 0);
  } catch {
    // Ignore — Redis unavailable, stale data will expire naturally
  }
}
