import { prisma } from '@delve/database'
import {
  ADMIN_GENERIC_AUTH_FAILURE_MESSAGE,
  isEmailIdentifier,
  normalizeEmail,
  normalizeUsername,
  type AdminLoginBody,
  type AdminMeData,
  type SafeAdminUser,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { createRawToken, hashToken, verifyPassword } from '../auth/crypto.js'
import { rateLimit } from '../auth/rate-limit.js'
import { createSessionRecord } from '../auth/session.js'
import type { ApproximateGeo } from '../auth/geo.js'
import { writeAdminAudit, newCorrelationId } from './admin-audit.js'

function adminExpiry(env: Env): Date {
  return new Date(Date.now() + env.ADMIN_SESSION_TTL_HOURS * 60 * 60 * 1000)
}

function toSafeAdmin(user: {
  id: string
  email: string
  username: string
  travelerProfile?: { displayName: string } | null
}): SafeAdminUser {
  const display = user.travelerProfile?.displayName?.trim() || null
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: display || null,
    role: 'admin',
    emailVerified: true,
  }
}

async function failLogin(
  correlationId: string,
  identifier: string,
  reason: string,
): Promise<never> {
  await writeAdminAudit({
    action: 'ADMIN_LOGIN_FAILED',
    outcome: 'failure',
    reason,
    identifier,
    correlationId,
  })
  throw new AppError(401, 'INVALID_CREDENTIALS', ADMIN_GENERIC_AUTH_FAILURE_MESSAGE)
}

/**
 * Administrator cookie session login. Never returns tokens to JavaScript.
 */
export async function adminLogin(
  env: Env,
  body: AdminLoginBody,
  ip: string,
  meta?: { userAgent?: string; geo?: ApproximateGeo },
): Promise<{ user: SafeAdminUser; rawSessionToken: string; expiresAt: Date; correlationId: string }> {
  const correlationId = newCorrelationId()
  const ipLimit = rateLimit(`admin-login-ip:${ip}`, 20, 15 * 60 * 1000)
  const idKey = body.identifier.trim().toLowerCase()
  const idLimit = rateLimit(`admin-login-id:${idKey}`, 10, 15 * 60 * 1000)
  if (!ipLimit.ok || !idLimit.ok) {
    await writeAdminAudit({
      action: 'ADMIN_LOGIN_FAILED',
      outcome: 'failure',
      reason: 'rate_limited',
      identifier: idKey,
      correlationId,
    })
    throw new AppError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Try again later.')
  }

  // Progressive delay based on remaining budget (privacy-safe brute-force friction).
  const remaining = Math.min(ipLimit.remaining, idLimit.remaining)
  if (remaining <= 5) {
    await new Promise(r => setTimeout(r, (6 - remaining) * 200))
  }

  const identifier = body.identifier.trim()
  const found = isEmailIdentifier(identifier)
    ? await prisma.user.findUnique({
        where: { email: normalizeEmail(identifier) },
        include: { travelerProfile: true },
      })
    : await prisma.user.findUnique({
        where: { usernameNormalized: normalizeUsername(identifier) },
        include: { travelerProfile: true },
      })

  if (!found) {
    await failLogin(correlationId, idKey, 'unknown_account')
  }
  const user = found!

  const passwordOk = await verifyPassword(body.password, user.passwordHash)
  if (!passwordOk) {
    await failLogin(correlationId, idKey, 'bad_password')
  }

  // Generic failure for non-admin, inactive, or unverified — no role enumeration.
  if (
    user.role !== 'admin' ||
    !user.emailVerifiedAt ||
    user.accountStatus !== 'active'
  ) {
    await failLogin(correlationId, idKey, 'ineligible')
  }

  const rawSessionToken = createRawToken()
  const session = await createSessionRecord(user.id, hashToken(rawSessionToken), adminExpiry(env), {
    userAgent: meta?.userAgent,
    geo: meta?.geo,
    isAdminSession: true,
  })

  await writeAdminAudit({
    action: 'ADMIN_LOGIN_SUCCEEDED',
    outcome: 'success',
    actorUserId: user.id,
    actorSessionId: session.id,
    correlationId,
  })

  return {
    user: toSafeAdmin(user),
    rawSessionToken,
    expiresAt: session.expiresAt,
    correlationId,
  }
}

export async function adminLogout(sessionId: string | undefined, userId: string | undefined) {
  if (sessionId) {
    await prisma.session.updateMany({
      where: { id: sessionId, isAdminSession: true, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'admin_logout' },
    })
  }
  await writeAdminAudit({
    action: 'ADMIN_LOGOUT',
    outcome: 'success',
    actorUserId: userId || null,
    actorSessionId: sessionId || null,
  })
  return { message: 'Signed out' }
}

export async function adminLogoutAll(userId: string, currentSessionId?: string) {
  const result = await prisma.session.updateMany({
    where: { userId, isAdminSession: true, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: 'admin_logout_all' },
  })
  await writeAdminAudit({
    action: 'ADMIN_LOGOUT_ALL',
    outcome: 'success',
    actorUserId: userId,
    actorSessionId: currentSessionId || null,
    metadata: { revokedCount: result.count },
  })
  return { message: 'Signed out from every administrator session', revokedCount: result.count }
}

export async function getAdminMe(env: Env, userId: string, sessionId: string): Promise<AdminMeData> {
  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { travelerProfile: true },
    }),
    prisma.session.findUnique({ where: { id: sessionId } }),
  ])
  if (!user || user.role !== 'admin' || !user.emailVerifiedAt || user.accountStatus !== 'active') {
    throw new AppError(403, 'ADMIN_FORBIDDEN', 'Administrator access required')
  }
  if (!session || session.userId !== userId || !session.isAdminSession || session.revokedAt) {
    throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  }
  return {
    user: toSafeAdmin(user),
    session: {
      expiresAt: session.expiresAt.toISOString(),
      idleTimeoutMinutes: env.ADMIN_SESSION_IDLE_TIMEOUT_MINUTES,
    },
    permissions: [],
  }
}

/**
 * Future role management boundary — not exposed as a public registration path.
 */
export async function grantAdminRole(actorUserId: string, targetUserId: string) {
  if (actorUserId === targetUserId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Administrators cannot grant their own role through this path.')
  }
  const actor = await prisma.user.findUnique({ where: { id: actorUserId } })
  if (!actor || actor.role !== 'admin' || actor.accountStatus !== 'active') {
    throw new AppError(403, 'ADMIN_FORBIDDEN', 'Administrator access required')
  }
  const target = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!target) throw new AppError(404, 'NOT_FOUND', 'User not found')
  if (target.role === 'admin') {
    return { message: 'User is already an administrator' }
  }
  if (!target.emailVerifiedAt || target.accountStatus !== 'active') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Target account must be active and verified.')
  }
  await prisma.user.update({ where: { id: targetUserId }, data: { role: 'admin' } })
  await writeAdminAudit({
    action: 'ADMIN_ROLE_GRANTED',
    outcome: 'success',
    actorUserId,
    targetType: 'user',
    targetId: targetUserId,
  })
  return { message: 'Administrator role granted' }
}

export async function removeAdminRole(actorUserId: string, targetUserId: string) {
  const actor = await prisma.user.findUnique({ where: { id: actorUserId } })
  if (!actor || actor.role !== 'admin' || actor.accountStatus !== 'active') {
    throw new AppError(403, 'ADMIN_FORBIDDEN', 'Administrator access required')
  }
  const activeAdmins = await prisma.user.count({
    where: { role: 'admin', accountStatus: 'active' },
  })
  if (activeAdmins <= 1 && targetUserId) {
    const target = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (target?.role === 'admin') {
      throw new AppError(
        400,
        'LAST_ADMIN',
        'Cannot remove the final active administrator without a recovery process.',
      )
    }
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: targetUserId }, data: { role: 'traveler' } }),
    prisma.session.updateMany({
      where: { userId: targetUserId, isAdminSession: true, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'admin_role_removed' },
    }),
  ])
  await writeAdminAudit({
    action: 'ADMIN_ROLE_REMOVED',
    outcome: 'success',
    actorUserId,
    targetType: 'user',
    targetId: targetUserId,
  })
  return { message: 'Administrator role removed and admin sessions revoked' }
}
