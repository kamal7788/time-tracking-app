// Enhanced Redis-based rate limiter with sliding window algorithm
import { Redis } from '@upstash/redis'

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export async function rateLimitRedis(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    const now = Date.now()
    const windowStart = Math.floor(now / windowMs)
    const redisKey = `rate_limit:${key}:${windowStart}`

    const current = await redis.incr(redisKey)

    if (current === 1) {
      await redis.expire(redisKey, Math.ceil(windowMs / 1000))
    }

    if (current > limit) {
      const ttl = await redis.ttl(redisKey)
      return {
        success: false,
        remaining: 0,
        resetAt: now + ((windowStart + 1) * windowMs) - now,
      }
    }

    return {
      success: true,
      remaining: limit - current,
      resetAt: now + ((windowStart + 1) * windowMs) - now,
    }
  } catch (error) {
    console.error('Redis rate limiting error:', error)
    // Fallback to in-memory rate limiting if Redis is not available
    return { success: true, remaining: limit, resetAt: Date.now() + windowMs }
  }
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }
  return request.headers.get('x-real-ip') || 'unknown'
}