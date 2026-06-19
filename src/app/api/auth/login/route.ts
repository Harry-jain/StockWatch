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
    // Deliberately no maxAge/expires: this is a session cookie that clears
    // when the browser/PWA is fully closed, so reopening the app always
    // asks for the password again. The JWT itself still carries its own
    // JWT_EXPIRY_HOURS expiration as a backstop in case the browser ever
    // keeps the cookie alive across a close (e.g. some mobile background
    // process quirks).
  })
  return response
}
