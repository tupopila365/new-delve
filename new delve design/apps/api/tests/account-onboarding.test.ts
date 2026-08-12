import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    travelerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    emailChangeRequest: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    session: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    securityEvent: {
      create: vi.fn(),
    },
    follow: {
      count: vi.fn().mockResolvedValue(0),
    },
    post: {
      count: vi.fn().mockResolvedValue(0),
    },
    passwordResetToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown) => {
      if (Array.isArray(ops)) return Promise.all(ops)
      return ops
    }),
  },
}))

vi.mock('../src/modules/email/brevo.js', () => ({
  createBrevoEmailProvider: () => ({
    sendTransactionalEmail: vi.fn().mockResolvedValue({ ok: true }),
  }),
}))

import { prisma } from '@delve/database'
import { loadEnv } from '../src/config/env.js'
import {
  completeOnboarding,
  deactivateAccount,
  getOnboarding,
  getPreferences,
  patchOnboarding,
  requestEmailChange,
  updatePreferences,
  verifyEmailChange,
  changePassword,
  listSessions,
  logoutAll,
} from '../src/modules/account/account.service.js'
import { hashPassword, hashToken } from '../src/modules/auth/crypto.js'
import { AppError } from '../src/middleware/error-handler.js'
import { resetRateLimits } from '../src/modules/auth/rate-limit.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  BREVO_API_KEY: 'key',
  BREVO_SENDER_EMAIL: 'noreply@delveworldwide.me',
})

const verifiedUser = {
  id: 'u1',
  email: 'a@example.com',
  username: 'traveler1',
  passwordHash: '',
  emailVerifiedAt: new Date(),
  accountStatus: 'active',
}

describe('onboarding and account settings', () => {
  beforeEach(() => {
    resetRateLimits()
    vi.clearAllMocks()
    vi.mocked(prisma.securityEvent.create).mockResolvedValue({} as never)
  })

  it('blocks unverified users from onboarding', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...verifiedUser,
      emailVerifiedAt: null,
      accountStatus: 'pending_verification',
    } as never)
    await expect(getOnboarding(env, 'u1')).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' })
  })

  it('creates profile and saves progress between steps', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(verifiedUser as never)
    vi.mocked(prisma.travelerProfile.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.travelerProfile.create).mockResolvedValue({
      userId: 'u1',
      displayName: '',
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      homeCity: null,
      homeCountryCode: null,
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
      interests: [],
      onboardingStatus: 'NOT_STARTED',
      onboardingCompletedAt: null,
      createdAt: new Date('2026-01-01'),
      profileVisibility: 'PUBLIC',
    } as never)
    vi.mocked(prisma.travelerProfile.update).mockResolvedValue({
      userId: 'u1',
      displayName: 'Amara',
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      homeCity: null,
      homeCountryCode: null,
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
      interests: [],
      onboardingStatus: 'IN_PROGRESS',
      onboardingCompletedAt: null,
      createdAt: new Date('2026-01-01'),
      profileVisibility: 'PUBLIC',
    } as never)

    const patched = await patchOnboarding(env, 'u1', { displayName: 'Amara', step: 'identity' })
    expect(patched.onboardingStatus).toBe('IN_PROGRESS')
    expect(patched.displayName).toBe('Amara')
    expect(patched.username).toBe('traveler1')
  })

  it('requires fields on completion and marks completed', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(verifiedUser as never)
    vi.mocked(prisma.travelerProfile.findUnique).mockResolvedValue({
      onboardingStatus: 'IN_PROGRESS',
    } as never)
    vi.mocked(prisma.travelerProfile.update).mockResolvedValue({
      userId: 'u1',
      displayName: 'Amara',
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      homeCity: null,
      homeCountryCode: null,
      preferredCurrency: 'NAD',
      preferredLanguage: 'en',
      interests: ['nature'],
      onboardingStatus: 'COMPLETED',
      onboardingCompletedAt: new Date(),
      createdAt: new Date('2026-01-01'),
      profileVisibility: 'PUBLIC',
    } as never)
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.notificationPreference.create).mockResolvedValue({} as never)

    const done = await completeOnboarding(env, 'u1', {
      displayName: 'Amara',
      preferredCurrency: 'NAD',
      preferredLanguage: 'en',
      bio: null,
      homeCity: null,
      homeCountryCode: null,
      interests: ['nature'],
    })
    expect(done.onboardingStatus).toBe('COMPLETED')
    expect(done.onboardingCompletedAt).toBeTruthy()
  })

  it('rejects completed onboarding reopen via patch', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(verifiedUser as never)
    vi.mocked(prisma.travelerProfile.findUnique).mockResolvedValue({
      onboardingStatus: 'COMPLETED',
    } as never)
    await expect(patchOnboarding(env, 'u1', { displayName: 'X' })).rejects.toMatchObject({
      code: 'ONBOARDING_COMPLETE',
    })
  })

  it('email change requires correct password and verifies token once', async () => {
    const passwordHash = await hashPassword('Password1!')
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ ...verifiedUser, passwordHash } as never)
      .mockResolvedValueOnce(null)
    vi.mocked(prisma.emailChangeRequest.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.emailChangeRequest.create).mockResolvedValue({} as never)

    const requested = await requestEmailChange(
      env,
      'u1',
      { newEmail: 'new@example.com', currentPassword: 'Password1!' },
      '1.1.1.1',
    )
    expect(requested.message).toMatch(/confirmation/i)

    await expect(
      requestEmailChange(env, 'u1', { newEmail: 'new@example.com', currentPassword: 'wrong' }, '1.1.1.1'),
    ).rejects.toBeInstanceOf(AppError)

    const raw = 'email-change-token'
    vi.mocked(prisma.emailChangeRequest.findUnique).mockResolvedValue({
      id: 'ec1',
      userId: 'u1',
      newEmail: 'new@example.com',
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    } as never)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...verifiedUser, passwordHash } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([])

    const verified = await verifyEmailChange(env, raw)
    expect(verified.message).toMatch(/Email updated/i)
  })

  it('password change revokes other sessions', async () => {
    const passwordHash = await hashPassword('Password1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...verifiedUser, passwordHash } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 2 })
    vi.mocked(prisma.session.create).mockResolvedValue({ id: 's-new' } as never)

    const result = await changePassword(
      env,
      'u1',
      { currentPassword: 'Password1!', newPassword: 'Password2!' },
      'current-refresh',
    )
    expect(result.message).toMatch(/signed out/i)
    expect(prisma.session.updateMany).toHaveBeenCalled()
  })

  it('lists sessions without exposing tokens and supports logout-all', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(verifiedUser as never)
    vi.mocked(prisma.session.findMany).mockResolvedValue([
      {
        id: 's1',
        tokenHash: 'hash',
        browserName: 'Chrome',
        browserMajorVersion: 120,
        operatingSystem: 'Windows',
        deviceType: 'desktop',
        deviceLabel: null,
        approxCity: null,
        approxRegion: null,
        approxCountryCode: null,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      },
    ] as never)
    const sessions = await listSessions('u1')
    expect(sessions[0]).not.toHaveProperty('tokenHash')
    expect(sessions[0]?.id).toBe('s1')
    expect(sessions[0]?.description).toBe('Chrome on Windows')

    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 1 })
    const out = await logoutAll('u1')
    expect(out.message).toMatch(/every device/i)
  })

  it('keeps security emails required and marketing default off', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(verifiedUser as never)
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.notificationPreference.create).mockResolvedValue({
      securityAccount: true,
      bookingTrip: true,
      providerMessages: true,
      communityActivity: true,
      productUpdates: false,
      marketing: false,
      inApp: true,
      marketingOptInAt: null,
    } as never)
    const prefs = await getPreferences('u1')
    expect(prefs.marketing).toBe(false)
    expect(prefs.securityAccount).toBe(true)

    await expect(updatePreferences('u1', { securityAccount: false })).rejects.toMatchObject({
      code: 'SECURITY_EMAILS_REQUIRED',
    })
  })

  it('deactivates account and blocks further access checks', async () => {
    const passwordHash = await hashPassword('Password1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...verifiedUser, passwordHash } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 1 })
    const result = await deactivateAccount('u1', 'Password1!')
    expect(result.message).toMatch(/deactivated/i)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { accountStatus: 'deactivated' } }),
    )
  })
})
