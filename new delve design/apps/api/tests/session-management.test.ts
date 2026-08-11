import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    securityEvent: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '@delve/database'
import {
  listSessions,
  logoutAll,
  logoutOthers,
  revokeSession,
} from '../src/modules/account/account.service.js'
import {
  LAST_SEEN_THROTTLE_MS,
  purgeExpiredSessionRecords,
  resetLastSeenThrottle,
  toSessionSummary,
  touchSessionLastSeen,
} from '../src/modules/auth/session.js'
import { parseUserAgent, formatApproximateLocation } from '../src/modules/auth/user-agent.js'
import { resolveApproximateGeo } from '../src/modules/auth/geo.js'
import { loadEnv } from '../src/config/env.js'
import { hashToken } from '../src/modules/auth/crypto.js'
import { AppError } from '../src/middleware/error-handler.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  TRUST_GEO_HEADERS: 'true',
  SESSION_RETENTION_DAYS: '90',
  SECURITY_EVENT_RETENTION_DAYS: '365',
})

const verifiedUser = {
  id: 'u1',
  email: 'a@example.com',
  username: 'amara',
  emailVerifiedAt: new Date(),
  accountStatus: 'active',
  passwordHash: 'x',
}

function sessionRow(overrides: Record<string, unknown> = {}) {
  const now = new Date()
  return {
    id: 's1',
    userId: 'u1',
    tokenHash: hashToken('current-refresh'),
    tokenFamilyId: 'fam-1',
    isAdminSession: false,
    browserName: 'Chrome',
    browserMajorVersion: 120,
    operatingSystem: 'Windows',
    deviceType: 'desktop',
    deviceLabel: null,
    approxCity: null,
    approxRegion: null,
    approxCountryCode: null,
    lastSeenAt: now,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 86400000),
    revokedAt: null,
    revokedReason: null,
    ...overrides,
  }
}

describe('user-agent and location privacy', () => {
  it('parses common browsers without fingerprinting', () => {
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0').description).toBe(
      'Chrome on Windows',
    )
    expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari/604.1').description).toMatch(
      /Safari on iPhone/,
    )
    expect(parseUserAgent(undefined).description).toBe('Unknown browser')
  })

  it('formats approximate location only from coarse fields', () => {
    expect(formatApproximateLocation({ city: 'Windhoek', region: 'Khomas', countryCode: 'NA' })).toBe(
      'Windhoek, Khomas, NA',
    )
    expect(formatApproximateLocation({})).toBeNull()
  })

  it('resolves geo only from trusted headers and never invents', () => {
    const empty = resolveApproximateGeo({ headers: {} } as never, { ...env, TRUST_GEO_HEADERS: false })
    expect(empty.city).toBeNull()

    const fromCf = resolveApproximateGeo(
      {
        headers: {
          'cf-ipcity': 'Windhoek',
          'cf-region': 'Khomas',
          'cf-ipcountry': 'NA',
        },
      } as never,
      env,
    )
    expect(fromCf).toEqual({ city: 'Windhoek', region: 'Khomas', countryCode: 'NA' })
  })
})

describe('session API behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLastSeenThrottle()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(verifiedUser as never)
    vi.mocked(prisma.securityEvent.create).mockResolvedValue({} as never)
  })

  it('lists sessions with current indicator and without token/IP fields', async () => {
    const current = sessionRow({ id: 's-current', tokenHash: hashToken('current-refresh') })
    const other = sessionRow({
      id: 's-other',
      tokenHash: hashToken('other'),
      lastSeenAt: new Date(Date.now() - 60_000),
      approxCity: 'Windhoek',
      approxCountryCode: 'NA',
    })
    vi.mocked(prisma.session.findMany).mockResolvedValue([other, current] as never)

    const sessions = await listSessions('u1', 'current-refresh')
    expect(sessions[0]?.isCurrent).toBe(true)
    expect(sessions[0]?.id).toBe('s-current')
    expect(sessions[1]?.description).toBe('Chrome on Windows')
    expect(sessions[1]?.approximateLocation).toContain('Windhoek')
    for (const s of sessions) {
      expect(s).not.toHaveProperty('tokenHash')
      expect(s).not.toHaveProperty('ip')
      expect(s).not.toHaveProperty('userAgent')
      expect(JSON.stringify(s)).not.toMatch(/tokenHash|current-refresh/)
    }
  })

  it('shows location unavailable when geo is missing', async () => {
    vi.mocked(prisma.session.findMany).mockResolvedValue([sessionRow()] as never)
    const sessions = await listSessions('u1', 'current-refresh')
    expect(sessions[0]?.locationUnavailable).toBe(true)
    expect(sessions[0]?.approximateLocation).toBeNull()
  })

  it('rejects revoking another user’s session', async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValue(null)
    await expect(revokeSession('u1', 's-foreign', 'current-refresh')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('revokes another session and is idempotent when already revoked', async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValue(
      sessionRow({ id: 's-other', tokenHash: hashToken('other'), revokedAt: null }) as never,
    )
    vi.mocked(prisma.session.update).mockResolvedValue({} as never)
    const first = await revokeSession('u1', 's-other', 'current-refresh')
    expect(first.revokedCurrent).toBe(false)

    vi.mocked(prisma.session.findFirst).mockResolvedValue(
      sessionRow({ id: 's-other', tokenHash: hashToken('other'), revokedAt: new Date() }) as never,
    )
    const second = await revokeSession('u1', 's-other', 'current-refresh')
    expect(second.revokedCurrent).toBe(false)
  })

  it('revoking the current session signs the traveler out', async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValue(sessionRow({ id: 's-current' }) as never)
    vi.mocked(prisma.session.update).mockResolvedValue({} as never)
    const result = await revokeSession('u1', 's-current', 'current-refresh')
    expect(result.revokedCurrent).toBe(true)
  })

  it('logout-others keeps current and returns count', async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValue(sessionRow() as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 2 })
    const out = await logoutOthers('u1', 'current-refresh')
    expect(out.revokedCount).toBe(2)
  })

  it('logout-all revokes every active session', async () => {
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 3 })
    const out = await logoutAll('u1')
    expect(out.revokedCount).toBe(3)
    expect(out.message).toMatch(/every device/i)
  })

  it('marks expired sessions in summary status', () => {
    const summary = toSessionSummary(
      sessionRow({
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
      }) as never,
      null,
    )
    expect(summary.status).toBe('expired')
  })

  it('throttles last-seen writes and skips revoked sessions', async () => {
    const active = sessionRow({
      id: 'touch-1',
      lastSeenAt: new Date(Date.now() - LAST_SEEN_THROTTLE_MS - 1000),
    })
    vi.mocked(prisma.session.findUnique).mockResolvedValue(active as never)
    vi.mocked(prisma.session.update).mockResolvedValue({} as never)

    await touchSessionLastSeen('touch-1', LAST_SEEN_THROTTLE_MS)
    await touchSessionLastSeen('touch-1', LAST_SEEN_THROTTLE_MS)
    expect(prisma.session.update).toHaveBeenCalledTimes(1)

    resetLastSeenThrottle()
    vi.mocked(prisma.session.findUnique).mockResolvedValue(
      sessionRow({ id: 'touch-2', revokedAt: new Date() }) as never,
    )
    await touchSessionLastSeen('touch-2', LAST_SEEN_THROTTLE_MS)
    expect(prisma.session.update).toHaveBeenCalledTimes(1)
  })

  it('respects a custom throttle interval without repeated writes', async () => {
    const active = sessionRow({
      id: 'touch-custom',
      lastSeenAt: new Date(Date.now() - 10_000),
    })
    vi.mocked(prisma.session.findUnique).mockResolvedValue(active as never)
    vi.mocked(prisma.session.update).mockResolvedValue({} as never)

    await touchSessionLastSeen('touch-custom', 60_000)
    await touchSessionLastSeen('touch-custom', 60_000)
    expect(prisma.session.update).toHaveBeenCalledTimes(0)
  })

  it('purge removes old revoked sessions and security events', async () => {
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 4 })
    vi.mocked(prisma.securityEvent.deleteMany).mockResolvedValue({ count: 2 })
    const out = await purgeExpiredSessionRecords(env)
    expect(out.deletedSessions).toBe(4)
    expect(out.deletedSecurityEvents).toBe(2)
  })
})

describe('ownership errors', () => {
  it('surfaces AppError for missing sessions', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(verifiedUser as never)
    vi.mocked(prisma.session.findFirst).mockResolvedValue(null)
    await expect(revokeSession('u1', 'missing')).rejects.toBeInstanceOf(AppError)
  })
})
