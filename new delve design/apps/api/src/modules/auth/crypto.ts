import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { Env } from '../../config/env.js'

const ACCESS_TTL_SEC = 60 * 15
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 30
const BCRYPT_ROUNDS = 12
/** Password-reset tokens expire after 30 minutes. */
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30
/** Email verification OTP expires after 15 minutes. */
const VERIFICATION_CODE_TTL_MS = 1000 * 60 * 15

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createRawToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/** Six-digit numeric code for email verification (100000–999999). */
export function createVerificationCode(): string {
  return String(randomInt(100_000, 1_000_000))
}

/** One-way SHA-256 hex digest. Raw tokens are never stored. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** Constant-time equality for equal-length strings (e.g. hex hashes). */
export function tokensEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function verificationExpiry(env: Env): Date {
  const hours = env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

export function verificationCodeExpiry(): Date {
  return new Date(Date.now() + VERIFICATION_CODE_TTL_MS)
}

export function passwordResetExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MS)
}

export function passwordResetTtlMs(): number {
  return PASSWORD_RESET_TTL_MS
}

export function refreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_TTL_MS)
}

export function accessTtlSeconds(): number {
  return ACCESS_TTL_SEC
}

function secretKey(env: Env) {
  return new TextEncoder().encode(env.SESSION_SECRET)
}

export async function signAccessToken(env: Env, userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sub: userId, typ: 'access', sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(secretKey(env))
}

export async function verifyAccessToken(
  env: Env,
  token: string,
): Promise<{ userId: string; sessionId?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(env))
    if (payload.typ !== 'access' || typeof payload.sub !== 'string') return null
    return {
      userId: payload.sub,
      sessionId: typeof payload.sid === 'string' ? payload.sid : undefined,
    }
  } catch {
    return null
  }
}
