import type { Response } from 'express'
import type { Env } from '../../config/env.js'
import { createRawToken, tokensEqual } from '../auth/crypto.js'

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const key = part.slice(0, idx).trim()
    const raw = part.slice(idx + 1).trim()
    if (!key) continue
    try {
      out[key] = decodeURIComponent(raw)
    } catch {
      out[key] = raw
    }
  }
  return out
}

/** Staging/production always use Secure cookies. Local HTTP development does not. */
export function adminCookiesMustBeSecure(env: Env): boolean {
  return env.appEnv === 'staging' || env.appEnv === 'production'
}

export function adminCookieOptions(env: Env) {
  const maxAgeSec = env.ADMIN_SESSION_TTL_HOURS * 60 * 60
  const secure = adminCookiesMustBeSecure(env)
  return {
    name: env.ADMIN_SESSION_COOKIE_NAME,
    csrfName: env.ADMIN_CSRF_COOKIE_NAME,
    maxAgeSec,
    path: '/api/v2/admin',
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure,
  }
}

function appendCookie(res: Response, parts: string[]) {
  res.append('Set-Cookie', parts.join('; '))
}

export function setAdminSessionCookie(res: Response, env: Env, rawToken: string) {
  const opts = adminCookieOptions(env)
  const parts = [
    `${opts.name}=${encodeURIComponent(rawToken)}`,
    `Path=${opts.path}`,
    'HttpOnly',
    `SameSite=${opts.sameSite}`,
    `Max-Age=${opts.maxAgeSec}`,
  ]
  if (opts.secure) parts.push('Secure')
  appendCookie(res, parts)
}

export function clearAdminSessionCookie(res: Response, env: Env) {
  const opts = adminCookieOptions(env)
  const parts = [
    `${opts.name}=`,
    `Path=${opts.path}`,
    'HttpOnly',
    `SameSite=${opts.sameSite}`,
    'Max-Age=0',
  ]
  if (opts.secure) parts.push('Secure')
  appendCookie(res, parts)
}

/**
 * Double-submit CSRF cookie (readable by JS). Paired with `X-CSRF-Token` header.
 * Not HttpOnly so admin-web can echo it on mutating requests.
 */
export function issueAdminCsrfToken(): string {
  return createRawToken(32)
}

export function setAdminCsrfCookie(res: Response, env: Env, csrfToken: string) {
  const opts = adminCookieOptions(env)
  const parts = [
    `${opts.csrfName}=${encodeURIComponent(csrfToken)}`,
    `Path=${opts.path}`,
    `SameSite=${opts.sameSite}`,
    `Max-Age=${opts.maxAgeSec}`,
  ]
  if (opts.secure) parts.push('Secure')
  appendCookie(res, parts)
}

export function clearAdminCsrfCookie(res: Response, env: Env) {
  const opts = adminCookieOptions(env)
  const parts = [`${opts.csrfName}=`, `Path=${opts.path}`, `SameSite=${opts.sameSite}`, 'Max-Age=0']
  if (opts.secure) parts.push('Secure')
  appendCookie(res, parts)
}

export function readAdminCsrfCookie(env: Env, cookieHeader: string | undefined): string | null {
  const value = parseCookies(cookieHeader)[env.ADMIN_CSRF_COOKIE_NAME]?.trim()
  return value || null
}

export function csrfHeaderMatchesCookie(headerToken: string | undefined, cookieToken: string | null): boolean {
  if (!headerToken?.trim() || !cookieToken) return false
  return tokensEqual(headerToken.trim(), cookieToken)
}
