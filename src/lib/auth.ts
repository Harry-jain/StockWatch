import bcryptjs from 'bcryptjs'
import { jwtVerify, SignJWT } from 'jose'

export const SESSION_COOKIE_NAME = 'stockwatch_session'
const ISSUER = 'stockwatch'
const AUDIENCE = 'stockwatch-user'
const SALT_ROUNDS = 12

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return new TextEncoder().encode(secret)
}

export async function hashPassword(plain: string): Promise<string> {
  return bcryptjs.hash(plain, SALT_ROUNDS)
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  try {
    return bcryptjs.compare(plain, hash)
  } catch (error) {
    console.error('Password comparison failed', error)
    return false
  }
}

export async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const expiryHours = Number(process.env.JWT_EXPIRY_HOURS ?? '12')
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${expiryHours}h`)
    .sign(getJwtSecret())
}

export async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}
