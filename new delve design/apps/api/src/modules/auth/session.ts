import { prisma } from '@delve/database'
import type { Env } from '../../config/env.js'
import { createRawToken, tokensEqual } from './crypto.js'
import { formatApproximateLocation, parseUserAgent } from './user-agent.js'
import type { ApproximateGeo } from './geo.js'

const DEFAULT_LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000

/** In-memory throttle so we do not hit PostgreSQL on every authenticated request. */
const lastTouchAttempt = new Map<string, number>()

let configuredThrottleMs = DEFAULT_LAST_SEEN_THROTTLE_MS

export function configureLastSeenThrottle(ms: number) {
  configuredThrottleMs = Math.max(1_000, ms)
}

export function getLastSeenThrottleMs() {
  return configuredThrottleMs
}

export type SessionCreateMeta = {
  userAgent?: string | null
  geo?: ApproximateGeo
  /** Preserve family across refresh rotation. Omit to start a new family. */
  tokenFamilyId?: string
  isAdminSession?: boolean
}

export async function createSessionRecord(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
  meta?: SessionCreateMeta,
) {
  const parsed = parseUserAgent(meta?.userAgent)
  const geo = meta?.geo
  const now = new Date()
  const tokenFamilyId = meta?.tokenFamilyId?.trim() || createRawToken(16)
  return prisma.session.create({
    data: {
      userId,
      tokenHash,
      tokenFamilyId,
      isAdminSession: Boolean(meta?.isAdminSession),
      expiresAt,
      lastSeenAt: now,
      browserName: parsed.browserName.slice(0, 64),
      browserMajorVersion: parsed.browserMajorVersion,
      operatingSystem: parsed.operatingSystem.slice(0, 64),
      deviceType: parsed.deviceType,
      approxCity: geo?.city || null,
      approxRegion: geo?.region || null,
      approxCountryCode: geo?.countryCode || null,
    },
  })
}

export async function revokeSessionFamily(
  tokenFamilyId: string,
  reason: string,
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { tokenFamilyId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  })
  return result.count
}

export function sessionDescription(row: {
  browserName: string | null
  operatingSystem: string | null
  deviceType: string | null
}): string {
  const browser = row.browserName?.trim() || 'Unknown browser'
  if (browser === 'Unknown browser') return 'Unknown browser'
  const os = row.operatingSystem?.trim() || ''
  if (!os || os === 'Unknown') return browser
  const osLabel =
    row.deviceType === 'phone' && os === 'iOS'
      ? 'iPhone'
      : row.deviceType === 'tablet' && (os === 'iPadOS' || os === 'iOS')
        ? 'iPad'
        : os
  return `${browser} on ${osLabel}`
}

export function toSessionSummary(
  row: {
    id: string
    tokenHash: string
    browserName: string | null
    browserMajorVersion: number | null
    operatingSystem: string | null
    deviceType: string | null
    deviceLabel: string | null
    approxCity: string | null
    approxRegion: string | null
    approxCountryCode: string | null
    lastSeenAt: Date | null
    createdAt: Date
    expiresAt: Date
    revokedAt: Date | null
  },
  currentHash: string | null,
) {
  const location = formatApproximateLocation({
    city: row.approxCity,
    region: row.approxRegion,
    countryCode: row.approxCountryCode,
  })
  const now = Date.now()
  let status: 'active' | 'expired' | 'revoked' = 'active'
  if (row.revokedAt) status = 'revoked'
  else if (row.expiresAt.getTime() <= now) status = 'expired'

  return {
    id: row.id,
    isCurrent: currentHash ? tokensEqual(row.tokenHash, currentHash) : false,
    description: sessionDescription(row),
    browserName: row.browserName,
    browserMajorVersion: row.browserMajorVersion,
    operatingSystem: row.operatingSystem,
    deviceType: (row.deviceType as 'desktop' | 'phone' | 'tablet' | 'unknown' | null) ?? 'unknown',
    deviceLabel: row.deviceLabel,
    approximateLocation: location,
    locationUnavailable: !location,
    lastActivityAt: (row.lastSeenAt ?? row.createdAt).toISOString(),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    status,
  }
}

/**
 * Throttled last-seen update. Safe to call on every authenticated request.
 * Skips revoked/expired sessions and avoids writing more than once per throttle window.
 */
export async function touchSessionLastSeen(
  sessionId: string | undefined | null,
  throttleMs: number = configuredThrottleMs,
): Promise<void> {
  if (!sessionId) return
  const now = Date.now()
  const windowMs = Math.max(1_000, throttleMs)
  const previous = lastTouchAttempt.get(sessionId) ?? 0
  if (now - previous < windowMs) return
  lastTouchAttempt.set(sessionId, now)

  const row = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!row || row.revokedAt || row.expiresAt.getTime() <= now) return

  const last = row.lastSeenAt?.getTime() ?? 0
  if (now - last < windowMs) return

  await prisma.session.update({
    where: { id: sessionId },
    data: { lastSeenAt: new Date(now) },
  })
}

/** For tests — clear in-memory throttle state. */
export function resetLastSeenThrottle() {
  lastTouchAttempt.clear()
}

export async function purgeExpiredSessionRecords(env: Env) {
  const sessionCutoff = new Date(Date.now() - env.SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const eventCutoff = new Date(Date.now() - env.SECURITY_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000)

  const [sessions, events] = await Promise.all([
    prisma.session.deleteMany({
      where: {
        OR: [
          { revokedAt: { not: null, lt: sessionCutoff } },
          { expiresAt: { lt: sessionCutoff }, revokedAt: null },
        ],
      },
    }),
    prisma.securityEvent.deleteMany({
      where: { createdAt: { lt: eventCutoff } },
    }),
  ])

  return { deletedSessions: sessions.count, deletedSecurityEvents: events.count }
}

/** @deprecated Prefer getLastSeenThrottleMs() */
export const LAST_SEEN_THROTTLE_MS = DEFAULT_LAST_SEEN_THROTTLE_MS
