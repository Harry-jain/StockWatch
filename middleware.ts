import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'stockwatch_session'
const ISSUER = 'stockwatch'
const AUDIENCE = 'stockwatch-user'

const PUBLIC_PATHS = ['/login', '/api/auth/login']

function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.upstash.io https://query1.finance.yahoo.com https://query2.finance.yahoo.com",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
    ].join('; '),
  )
  return response
}

function jsonUnauthorized(): NextResponse {
  return securityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function isAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    Boolean(pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|map)$/))
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
    return securityHeaders(NextResponse.next())
  }

  if (pathname.startsWith('/api/cron/')) {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return jsonUnauthorized()
    }
    return securityHeaders(NextResponse.next())
  }

  if (isPublicPath(pathname)) {
    return securityHeaders(NextResponse.next())
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    if (pathname.startsWith('/api/')) return jsonUnauthorized()
    return securityHeaders(NextResponse.redirect(new URL('/login', request.url)))
  }

  const valid = await verifyToken(token)
  if (!valid) {
    if (pathname.startsWith('/api/')) return jsonUnauthorized()
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('expired', '1')
    return securityHeaders(NextResponse.redirect(loginUrl))
  }

  const headers = new Headers(request.headers)
  headers.set('x-user', 'admin')
  return securityHeaders(NextResponse.next({ request: { headers } }))
}

export const config = {
  matcher: ['/((?!.*\\..*|_next/static|_next/image).*)'],
}
