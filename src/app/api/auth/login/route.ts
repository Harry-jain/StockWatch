import { Ratelimit } from '@upstash/ratelimit'
import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, SESSION_COOKIE_NAME, signJwt } from '@/lib/auth'
import { redis } from '@/lib/redis'

const hasRedisEnv = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'ratelimit:login',
})

export async function POST(request: NextRequest) {
  if (hasRedisEnv) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many attempts. Wait 15 minutes.' }, { status: 429 })
    }
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null
  const hash = process.env.APP_PASSWORD_HASH
  if (!body?.password || !hash) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const valid = await comparePassword(body.password, hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await signJwt({ sub: 'admin' })
  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: Number(process.env.JWT_EXPIRY_HOURS ?? '24') * 60 * 60,
  })
  return response
}
