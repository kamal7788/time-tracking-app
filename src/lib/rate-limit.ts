/**
 * Simple in-memory rate limiter.
 *
 * Suitable for single-instance deployments (one container). For multi-instance
 * setups, replace with a shared store (Redis/Upstash).
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Periodically clean expired buckets to avoid unbounded memory growth.
const SWEEP_INTERVAL_MS = 60_000
let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * @param key      Unique key, e.g. `login:${ip}` or `login:${ip}:${email}`
 * @param limit    Max attempts allowed within the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  existing.count += 1
  if (existing.count > limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt }
  }
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt }
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    // Take the last IP in the chain (closest to the trusted proxy) to reduce spoofing.
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
