import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      emailVerificationToken: {
        updateMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      usernameHistory: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
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
      passwordResetToken: {
        updateMany: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return arg({
            emailVerificationToken: {
              findUnique: vi.fn().mockResolvedValue({ id: 'tok1', usedAt: null }),
              update: vi.fn(),
            },
            user: { update: vi.fn() },
            usernameHistory: { create: vi.fn() },
          })
        }
        return Promise.all(arg as Promise<unknown>[])
      }),
    },
  }
})

vi.mock('../src/modules/email/brevo.js', () => ({
  sendVerificationEmail: vi.fn(),
}))

import { prisma } from '@delve/database'
import { sendVerificationEmail } from '../src/modules/email/brevo.js'
import { loadEnv } from '../src/config/env.js'
import {
  checkUsernameAvailability,
  loginUser,
  registerUser,
  resendVerification,
  verifyEmailToken,
  changeUsername,
} from '../src/modules/auth/auth.service.js'
import { hashPassword, hashToken } from '../src/modules/auth/crypto.js'
import { resetRateLimits } from '../src/modules/auth/rate-limit.js'
import { AppError } from '../src/middleware/error-handler.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  BREVO_API_KEY: 'test-key',
  BREVO_SENDER_EMAIL: 'noreply@delveworldwide.me',
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: '60',
  EMAIL_VERIFICATION_MAX_SENDS_PER_HOUR: '5',
})

describe('auth service (mocked)', () => {
  beforeEach(() => {
    resetRateLimits()
    vi.clearAllMocks()
  })

  it('marks delivery FAILED when Brevo fails and keeps account pending', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.usernameHistory.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      username: 'traveler1',
      usernameNormalized: 'traveler1',
      passwordHash: 'hash',
      emailVerifiedAt: null,
      accountStatus: 'pending_verification',
      usernameChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.emailVerificationToken.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue({
      id: 't1',
      userId: 'u1',
      tokenHash: 'h',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      deliveryStatus: 'PENDING',
      createdAt: new Date(),
    })
    vi.mocked(sendVerificationEmail).mockResolvedValue({
      ok: false,
      correlationId: 'c1',
      sanitizedError: 'brevo_http_500',
    })
    vi.mocked(prisma.emailVerificationToken.update).mockResolvedValue({} as never)

    const result = await registerUser(env, {
      username: 'traveler1',
      email: 'a@example.com',
      password: 'Password1',
      passwordConfirmation: 'Password1',
    })

    expect(result.deliveryStatus).toBe('FAILED')
    expect(result.message).toMatch(/could not send the verification email/i)
    expect(prisma.emailVerificationToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deliveryStatus: 'FAILED' } }),
    )
  })

  it('returns availability reasons', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.usernameHistory.findFirst).mockResolvedValue(null)
    const available = await checkUsernameAvailability('freshname', '1.1.1.1')
    expect(available).toEqual({
      username: 'freshname',
      valid: true,
      available: true,
      reason: 'available',
    })

    const reserved = await checkUsernameAvailability('Admin', '1.1.1.1')
    expect(reserved.reason).toBe('reserved')
    expect(reserved.available).toBe(false)

    const invalid = await checkUsernameAvailability('bad..name', '1.1.1.1')
    expect(invalid.reason).toBe('invalid')
  })

  it('rate limits username availability checks', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.usernameHistory.findFirst).mockResolvedValue(null)
    for (let i = 0; i < 30; i++) {
      await checkUsernameAvailability(`user${i}xx`, '9.9.9.9')
    }
    await expect(checkUsernameAvailability('user30xx', '9.9.9.9')).rejects.toBeInstanceOf(AppError)
  })

  it('verifies success, expired, used, and invalid tokens', async () => {
    expect(await verifyEmailToken('missing')).toMatchObject({ result: 'invalid' })

    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValueOnce({
      id: 't1',
      userId: 'u1',
      tokenHash: hashToken('used'),
      expiresAt: new Date(Date.now() + 100000),
      usedAt: new Date(),
      deliveryStatus: 'SENT',
      createdAt: new Date(),
      user: {
        id: 'u1',
        emailVerifiedAt: null,
        accountStatus: 'pending_verification',
      },
    } as never)
    expect(await verifyEmailToken('used')).toMatchObject({ result: 'used' })

    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValueOnce({
      id: 't2',
      userId: 'u1',
      tokenHash: hashToken('expired'),
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      deliveryStatus: 'SENT',
      createdAt: new Date(),
      user: {
        id: 'u1',
        emailVerifiedAt: null,
        accountStatus: 'pending_verification',
      },
    } as never)
    expect(await verifyEmailToken('expired')).toMatchObject({ result: 'expired' })

    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValueOnce({
      id: 't3',
      userId: 'u1',
      tokenHash: hashToken('ok'),
      expiresAt: new Date(Date.now() + 100000),
      usedAt: null,
      deliveryStatus: 'SENT',
      createdAt: new Date(),
      user: {
        id: 'u1',
        emailVerifiedAt: null,
        accountStatus: 'pending_verification',
      },
    } as never)
    expect(await verifyEmailToken('ok')).toMatchObject({ result: 'success' })
  })

  it('returns already_verified and account_disabled results', async () => {
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValueOnce({
      id: 't4',
      userId: 'u1',
      tokenHash: hashToken('done'),
      expiresAt: new Date(Date.now() + 100000),
      usedAt: null,
      deliveryStatus: 'SENT',
      createdAt: new Date(),
      user: { id: 'u1', emailVerifiedAt: new Date(), accountStatus: 'active' },
    } as never)
    expect(await verifyEmailToken('done')).toMatchObject({ result: 'already_verified' })

    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValueOnce({
      id: 't5',
      userId: 'u1',
      tokenHash: hashToken('off'),
      expiresAt: new Date(Date.now() + 100000),
      usedAt: null,
      deliveryStatus: 'SENT',
      createdAt: new Date(),
      user: { id: 'u1', emailVerifiedAt: null, accountStatus: 'disabled' },
    } as never)
    expect(await verifyEmailToken('off')).toMatchObject({ result: 'account_disabled' })
  })

  it('enforces resend cooldown', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      username: 'traveler1',
      emailVerifiedAt: null,
      accountStatus: 'pending_verification',
    } as never)
    vi.mocked(prisma.emailVerificationToken.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue({
      id: 't1',
      userId: 'u1',
      tokenHash: 'h',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      deliveryStatus: 'PENDING',
      createdAt: new Date(),
    } as never)
    vi.mocked(sendVerificationEmail).mockResolvedValue({ ok: true })
    vi.mocked(prisma.emailVerificationToken.update).mockResolvedValue({} as never)

    await resendVerification(env, 'a@example.com', '2.2.2.2')
    await expect(resendVerification(env, 'a@example.com', '2.2.2.2')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    })
  })

  it('logs in with email or username using a generic failure', async () => {
    const passwordHash = await hashPassword('Password1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      username: 'traveler1',
      usernameNormalized: 'traveler1',
      passwordHash,
      emailVerifiedAt: new Date(),
      accountStatus: 'active',
      usernameChangedAt: null,
    } as never)
    vi.mocked(prisma.session.create).mockResolvedValue({
      id: 'sess-1',
      tokenFamilyId: 'fam-1',
      isAdminSession: false,
    } as never)
    vi.mocked(prisma.securityEvent.create).mockResolvedValue({} as never)

    const byEmail = await loginUser(env, { identifier: 'a@example.com', password: 'Password1!' }, '3.3.3.3')
    expect(byEmail.user.username).toBe('traveler1')

    const byUsername = await loginUser(env, { identifier: 'Traveler1', password: 'Password1!' }, '3.3.3.3')
    expect(byUsername.user.email).toBe('a@example.com')

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    await expect(loginUser(env, { identifier: 'missing@x.com', password: 'Password1!' }, '3.3.3.3')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
  })

  it('changes username with password, cooldown, and reservation', async () => {
    const passwordHash = await hashPassword('Password1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      username: 'oldname',
      usernameNormalized: 'oldname',
      passwordHash,
      usernameChangedAt: null,
    } as never)
    vi.mocked(prisma.usernameHistory.findFirst).mockResolvedValue(null)

    const changed = await changeUsername(env, 'u1', { username: 'newname', currentPassword: 'Password1!' })
    expect(changed.username).toBe('newname')
    expect(prisma.$transaction).toHaveBeenCalled()

    await expect(changeUsername(env, 'u1', { username: 'other', currentPassword: 'wrong' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      username: 'newname',
      usernameNormalized: 'newname',
      passwordHash,
      usernameChangedAt: new Date(),
    } as never)
    await expect(changeUsername(env, 'u1', { username: 'third', currentPassword: 'Password1!' })).rejects.toMatchObject({
      code: 'USERNAME_CHANGE_COOLDOWN',
    })
  })

  it('does not include raw tokens in production email failure logs path', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.usernameHistory.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'u1',
      email: 'b@example.com',
      username: 'traveler2',
      usernameNormalized: 'traveler2',
      passwordHash: 'hash',
      emailVerifiedAt: null,
      accountStatus: 'pending_verification',
      usernameChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.emailVerificationToken.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue({
      id: 't9',
      userId: 'u1',
      tokenHash: 'hashed-only',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      deliveryStatus: 'PENDING',
      createdAt: new Date(),
    })
    vi.mocked(sendVerificationEmail).mockImplementation(async (_env, input) => {
      expect(input.verifyUrl).toContain('token=')
      return { ok: false, correlationId: 'corr', sanitizedError: 'brevo_http_400' }
    })
    vi.mocked(prisma.emailVerificationToken.update).mockResolvedValue({} as never)

    await registerUser(env, {
      username: 'traveler2',
      email: 'b@example.com',
      password: 'Password1',
      passwordConfirmation: 'Password1',
    })

    const logged = spy.mock.calls.map(c => JSON.stringify(c)).join(' ')
    expect(logged).not.toMatch(/token=[A-Za-z0-9_-]{20,}/)
    spy.mockRestore()
  })
})
