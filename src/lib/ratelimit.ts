import { Ratelimit } from '@upstash/ratelimit'
import type { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'

const hasRedisEnv = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

// Generous budget — this is a single-user app. The point isn't to throttle
// normal use (auto-save while typing notes, adding a few stocks), it's to
// bound damage if the session cookie ever leaks or a client bug loops.
const mutationLimiter = hasRedisEnv
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, '1 m'), prefix: 'ratelimit:mutate' })
  : null

/** Returns true if the request is within the rate limit (or limiting is disabled). */
export async function withinRateLimit(request: NextRequest): Promise<boolean> {
  if (!mutationLimiter) return true
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await mutationLimiter.limit(ip)
  return success
}
