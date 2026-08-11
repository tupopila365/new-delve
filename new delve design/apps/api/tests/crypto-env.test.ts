import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  createRawToken,
  hashToken,
  passwordResetTtlMs,
  tokensEqual,
} from '../src/modules/auth/crypto.js'
import { loadEnv } from '../src/config/env.js'

describe('token crypto', () => {
  it('creates at least 32 bytes of entropy as base64url', () => {
    const token = createRawToken(32)
    expect(token.length).toBeGreaterThanOrEqual(43)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('stores only sha256 hash of the raw token', () => {
    const raw = 'raw-token-value'
    const hashed = hashToken(raw)
    expect(hashed).toBe(createHash('sha256').update(raw).digest('hex'))
    expect(hashed).not.toContain(raw)
  })

  it('compares hashes in constant time and rejects mismatches', () => {
    const a = hashToken('alpha')
    const b = hashToken('alpha')
    const c = hashToken('beta')
    expect(tokensEqual(a, b)).toBe(true)
    expect(tokensEqual(a, c)).toBe(false)
    expect(tokensEqual(a, a.slice(0, 10))).toBe(false)
  })

  it('uses a 30-minute password-reset TTL', () => {
    expect(passwordResetTtlMs()).toBe(30 * 60 * 1000)
  })
})

describe('env validation', () => {
  const base = {
    DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
    SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  }

  it('requires Brevo in production', () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: 'production',
        TRAVELER_WEB_URL: 'https://delveworldwide.me',
      }),
    ).toThrow(/BREVO_API_KEY/)
  })

  it('requires https traveler URL in production', () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: 'production',
        TRAVELER_WEB_URL: 'http://delveworldwide.me',
        BREVO_API_KEY: 'key',
        BREVO_SENDER_EMAIL: 'noreply@delveworldwide.me',
      }),
    ).toThrow(/HTTPS/)
  })

  it('allows development without Brevo and exposes last-seen throttle', () => {
    const env = loadEnv({ ...base, NODE_ENV: 'development' })
    expect(env.brevoConfigured).toBe(false)
    expect(env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS).toBe(24)
    expect(env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS).toBe(60)
    expect(env.EMAIL_VERIFICATION_MAX_SENDS_PER_HOUR).toBe(5)
    expect(env.SESSION_LAST_SEEN_THROTTLE_SECONDS).toBe(300)
  })

  it('accepts a custom last-seen throttle', () => {
    const env = loadEnv({ ...base, NODE_ENV: 'test', SESSION_LAST_SEEN_THROTTLE_SECONDS: '120' })
    expect(env.SESSION_LAST_SEEN_THROTTLE_SECONDS).toBe(120)
  })

  it('refuses staging/production without HTTPS admin origins for Secure cookies', () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: 'production',
        TRAVELER_WEB_URL: 'https://delveworldwide.me',
        ADMIN_WEB_URL: 'http://localhost:5174',
        BREVO_API_KEY: 'key',
        BREVO_SENDER_EMAIL: 'noreply@delveworldwide.me',
        CLOUDINARY_CLOUD_NAME: 'c',
        CLOUDINARY_API_KEY: 'k',
        CLOUDINARY_API_SECRET: 's',
      }),
    ).toThrow(/ADMIN_WEB_URL.*HTTPS/i)

    const ok = loadEnv({
      ...base,
      NODE_ENV: 'production',
      TRAVELER_WEB_URL: 'https://delveworldwide.me',
      ADMIN_WEB_URL: 'https://admin.delveworldwide.me',
      ADMIN_WEB_ORIGIN: 'https://admin.delveworldwide.me',
      BREVO_API_KEY: 'key',
      BREVO_SENDER_EMAIL: 'noreply@delveworldwide.me',
      CLOUDINARY_CLOUD_NAME: 'c',
      CLOUDINARY_API_KEY: 'k',
      CLOUDINARY_API_SECRET: 's',
    })
    expect(ok.appEnv).toBe('production')
    expect(ok.ADMIN_WEB_ORIGIN.startsWith('https://')).toBe(true)
  })
})
