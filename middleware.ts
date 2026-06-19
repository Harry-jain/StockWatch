import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'stockwatch_session'
const ISSUER = 'stockwatch'
const AUDIENCE = 'stockwatch-user'

const PUBLIC_PATHS = ['/login', '/api/auth/login']

function securityHeaders(response: NextResponse, pathname: string): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.upstash.io https://query1.finance.yahoo.com https://query2.finance.yahoo.com",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  )
  // Sensitive JSON/API responses must never be cached by browsers, mobile
  // carrier transparent proxies, or CDNs — this is single-user private data.
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate')
  }
  return response
}

function jsonUnauthorized(pathname: string): NextResponse {
  return securityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), pathname)
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function isAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    Boolean(pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|map|webmanifest)$/))
  )
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return false
    await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isAsset(pathname)) {
    return securityHeaders(NextResponse.next(), pathname)
  }

  if (pathname.startsWith('/api/cron/')) {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return jsonUnauthorized(pathname)
    }
    return securityHeaders(NextResponse.next(), pathname)
  }

  if (isPublicPath(pathname)) {
    return securityHeaders(NextResponse.next(), pathname)
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    if (pathname.startsWith('/api/')) return jsonUnauthorized(pathname)
    return securityHeaders(NextResponse.redirect(new URL('/login', request.url)), pathname)
  }

  const valid = await verifyToken(token)
  if (!valid) {
    if (pathname.startsWith('/api/')) return jsonUnauthorized(pathname)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('expired', '1')
    return securityHeaders(NextResponse.redirect(loginUrl), pathname)
  }

  const headers = new Headers(request.headers)
  headers.set('x-user', 'admin')
  return securityHeaders(NextResponse.next({ request: { headers } }), pathname)
}

export const config = {
  // Only Next.js's own internal static-asset folders are excluded here.
  // Everything else -- including stock symbol paths like /stock/RELIANCE.NS
  // which legitimately contain a "." -- must run through middleware so the
  // isAsset()/auth checks above actually execute. (The previous matcher
  // excluded ANY path containing a dot, which silently let every stock
  // detail page and most per-symbol API routes skip auth entirely.)
  matcher: ['/((?!_next/static|_next/image).*)'],
}
