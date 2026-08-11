import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    securityEvent: {
      create: vi.fn(),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
    passwordResetToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}))

vi.mock('../src/modules/email/brevo.js', () => ({
  createBrevoEmailProvider: vi.fn(() => ({
    sendTransactionalEmail: vi.fn(async () => ({ ok: true })),
  })),
}))

import { prisma } from '@delve/database'
import { loadEnv } from '../src/config/env.js'
import {
  loginAdminUser,
  loginUser,
  refreshSession,
  requestPasswordReset,
  resetPassword,
} from '../src/modules/auth/auth.service.js'
import { createRawToken, hashPassword, hashToken, passwordResetExpiry } from '../src/modules/auth/crypto.js'
import { resetRateLimits } from '../src/modules/auth/rate-limit.js'
import { requireAuth, requireAdmin, type AuthedRequest } from '../src/middleware/require-auth.js'
import { AppError } from '../src/middleware/error-handler.js'
import { signAccessToken } from '../src/modules/auth/crypto.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  BREVO_API_KEY: 'test-key',
  BREVO_SENDER_EMAIL: 'noreply@delveworldwide.me',
  SESSION_LAST_SEEN_THROTTLE_SECONDS: '300',
})

const activeUser = {
  id: 'u1',
  email: 'a@example.com',
  username: 'traveler1',
  usernameNormalized: 'traveler1',
  emailVerifiedAt: new Date(),
  accountStatus: 'active' as const,
  role: 'traveler' as const,
  usernameChangedAt: null,
}

describe('refresh rotation and reuse detection', () => {
  beforeEach(() => {
    resetRateLimits()
    vi.clearAllMocks()
    vi.mocked(prisma.securityEvent.create).mockResolvedValue({} as never)
  })

  it('rotates into the same token family and never returns hashes', async () => {
    const oldRaw = 'old-refresh-token'
    const oldHash = hashToken(oldRaw)
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 's-old',
      userId: 'u1',
      tokenHash: oldHash,
      tokenFamilyId: 'family-a',
      isAdminSession: false,
      revokedAt: null,
      revokedReason: null,
      expiresAt: new Date(Date.now() + 86_400_000),
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser as never)
    vi.mocked(prisma.session.update).mockResolvedValue({} as never)
    vi.mocked(prisma.session.create).mockResolvedValue({
      id: 's-new',
      tokenFamilyId: 'family-a',
      isAdminSession: false,
    } as never)

    const result = await refreshSession(env, oldRaw)
    expect(result.tokens.refreshToken).toBeTruthy()
    expect(result.tokens.refreshToken).not.toBe(oldRaw)
    expect(JSON.stringify(result)).not.toMatch(/tokenHash|family-a/)
    expect(prisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's-old' },
        data: expect.objectContaining({ revokedReason: 'rotated' }),
      }),
    )
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenFamilyId: 'family-a',
          isAdminSession: false,
        }),
      }),
    )
    const storedHash = vi.mocked(prisma.session.create).mock.calls[0]?.[0]?.data?.tokenHash as string
    expect(storedHash).toBe(hashToken(result.tokens.refreshToken))
    expect(storedHash).not.toBe(result.tokens.refreshToken)
  })

  it('revokes the family when a rotated token is reused', async () => {
    const reused = 'rotated-refresh'
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 's-old',
      userId: 'u1',
      tokenHash: hashToken(reused),
      tokenFamilyId: 'family-b',
      isAdminSession: false,
      revokedAt: new Date(),
      revokedReason: 'rotated',
      expiresAt: new Date(Date.now() + 86_400_000),
    } as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 1 })

    await expect(refreshSession(env, reused)).rejects.toMatchObject({ code: 'INVALID_REFRESH' })
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenFamilyId: 'family-b', revokedAt: null },
        data: expect.objectContaining({ revokedReason: 'reuse_detected' }),
      }),
    )
    expect(prisma.securityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'refresh_reuse_detected' }),
      }),
    )
  })

  it('rejects revoked non-rotated tokens without family wipe', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 's1',
      userId: 'u1',
      tokenHash: hashToken('gone'),
      tokenFamilyId: 'family-c',
      isAdminSession: false,
      revokedAt: new Date(),
      revokedReason: 'logout',
      expiresAt: new Date(Date.now() + 86_400_000),
    } as never)

    await expect(refreshSession(env, 'gone')).rejects.toMatchObject({ code: 'INVALID_REFRESH' })
    expect(prisma.session.updateMany).not.toHaveBeenCalled()
  })
})

describe('administrator authorization', () => {
  beforeEach(() => {
    resetRateLimits()
    vi.clearAllMocks()
    vi.mocked(prisma.securityEvent.create).mockResolvedValue({} as never)
  })

  it('rejects traveler credentials on admin login', async () => {
    const passwordHash = await hashPassword('Password1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...activeUser,
      passwordHash,
      role: 'traveler',
    } as never)
    await expect(
      loginAdminUser(env, { identifier: 'a@example.com', password: 'Password1!' }, '1.1.1.1'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 })
  })

  it('issues an admin session for administrators', async () => {
    const passwordHash = await hashPassword('Password1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...activeUser,
      passwordHash,
      role: 'admin',
      travelerProfile: null,
    } as never)
    vi.mocked(prisma.session.create).mockResolvedValue({
      id: 'admin-sess',
      tokenFamilyId: 'admin-fam',
      isAdminSession: true,
      expiresAt: new Date(Date.now() + 8 * 3600_000),
    } as never)

    const result = await loginAdminUser(env, { identifier: 'a@example.com', password: 'Password1!' }, '1.1.1.1')
    expect(result.user.role).toBe('admin')
    expect(result.tokens).toBeNull()
    expect(result.rawSessionToken).toBeTruthy()
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isAdminSession: true }),
      }),
    )
  })

  it('traveler login never creates an admin session', async () => {
    const passwordHash = await hashPassword('Password1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...activeUser,
      passwordHash,
      role: 'admin',
    } as never)
    vi.mocked(prisma.session.create).mockResolvedValue({
      id: 'trav-sess',
      tokenFamilyId: 'trav-fam',
      isAdminSession: false,
    } as never)

    await loginUser(env, { identifier: 'a@example.com', password: 'Password1!' }, '1.1.1.1')
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isAdminSession: false }),
      }),
    )
  })

  it('requireAuth returns 401 without a bearer token', async () => {
    const middleware = requireAuth(env)
    const req = { headers: {} } as AuthedRequest
    const next = vi.fn()
    await middleware(req, {} as never, next)
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AppError)
    expect((next.mock.calls[0]?.[0] as AppError).statusCode).toBe(401)
  })

  it('requireAuth rejects revoked sessions immediately', async () => {
    const access = await signAccessToken(env, 'u1', 'sess-revoked')
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 'sess-revoked',
      userId: 'u1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
      isAdminSession: false,
    } as never)

    const middleware = requireAuth(env)
    const req = { headers: { authorization: `Bearer ${access}` } } as AuthedRequest
    const next = vi.fn()
    await middleware(req, {} as never, next)
    expect(next.mock.calls[0]?.[0]).toMatchObject({ code: 'SESSION_REVOKED', statusCode: 401 })
  })

  it('requireAdmin returns 403 for traveler sessions', () => {
    const middleware = requireAdmin()
    const req = {
      userId: 'u1',
      sessionId: 's1',
      userRole: 'traveler',
      isAdminSession: false,
    } as AuthedRequest
    const next = vi.fn()
    middleware(req, {} as never, next)
    expect(next.mock.calls[0]?.[0]).toMatchObject({ code: 'ADMIN_FORBIDDEN', statusCode: 403 })
  })

  it('requireAdmin allows admin role with admin session', () => {
    const middleware = requireAdmin()
    const req = {
      userId: 'u1',
      sessionId: 's1',
      userRole: 'admin',
      isAdminSession: true,
    } as AuthedRequest
    const next = vi.fn()
    middleware(req, {} as never, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('refresh revokes admin family when admin role was removed', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 's-admin',
      userId: 'u1',
      tokenHash: hashToken('admin-refresh'),
      tokenFamilyId: 'admin-family',
      isAdminSession: true,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86_400_000),
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...activeUser,
      role: 'traveler',
    } as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 1 })

    await expect(refreshSession(env, 'admin-refresh')).rejects.toMatchObject({ code: 'INVALID_REFRESH' })
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revokedReason: 'admin_role_removed' }),
      }),
    )
  })
})

describe('password reset security', () => {
  beforeEach(() => {
    resetRateLimits()
    vi.clearAllMocks()
    vi.mocked(prisma.securityEvent.create).mockResolvedValue({} as never)
  })

  it('returns a generic forgot-password response for unknown emails', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const out = await requestPasswordReset(env, 'missing@example.com', '8.8.8.8')
    expect(out.message).toMatch(/If an account exists/i)
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled()
  })

  it('stores only a hash for reset tokens and uses short expiry', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...activeUser,
      accountStatus: 'active',
    } as never)
    vi.mocked(prisma.passwordResetToken.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as never)

    const before = Date.now()
    await requestPasswordReset(env, 'a@example.com', '8.8.8.8')
    const createArg = vi.mocked(prisma.passwordResetToken.create).mock.calls[0]?.[0]?.data as {
      tokenHash: string
      expiresAt: Date
    }
    expect(createArg.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(createArg.expiresAt.getTime()).toBeGreaterThan(before)
    expect(createArg.expiresAt.getTime()).toBeLessThanOrEqual(before + 30 * 60 * 1000 + 5_000)
  })

  it('successful reset revokes all sessions and rejects reuse', async () => {
    const raw = createRawToken(16)
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: 'prt1',
      userId: 'u1',
      tokenHash: hashToken(raw),
      expiresAt: passwordResetExpiry(),
      usedAt: null,
      user: { ...activeUser, accountStatus: 'active' },
    } as never)
    vi.mocked(prisma.passwordResetToken.update).mockResolvedValue({} as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 2 })

    const first = await resetPassword(env, { token: raw, newPassword: 'NewPassword1!' })
    expect(first.result).toBe('success')
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revokedReason: 'password_reset' }),
      }),
    )

    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: 'prt1',
      userId: 'u1',
      tokenHash: hashToken(raw),
      expiresAt: passwordResetExpiry(),
      usedAt: new Date(),
      user: { ...activeUser },
    } as never)
    const reused = await resetPassword(env, { token: raw, newPassword: 'NewPassword1!' })
    expect(reused.result).toBe('used')
  })

  it('rejects reset for disabled accounts', async () => {
    const raw = 'disabled-token'
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: 'prt2',
      userId: 'u1',
      tokenHash: hashToken(raw),
      expiresAt: passwordResetExpiry(),
      usedAt: null,
      user: { ...activeUser, accountStatus: 'disabled' },
    } as never)
    const out = await resetPassword(env, { token: raw, newPassword: 'NewPassword1!' })
    expect(out.result).toBe('invalid')
  })
})
