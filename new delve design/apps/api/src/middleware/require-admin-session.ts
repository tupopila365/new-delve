import type { NextFunction, Request, Response } from 'express'
import { prisma } from '@delve/database'
import type { Env } from '../config/env.js'
import { isTrustedAdminOrigin } from '../config/cors.js'
import { AppError } from './error-handler.js'
import { hashToken } from '../modules/auth/crypto.js'
import { touchSessionLastSeen } from '../modules/auth/session.js'
import {
  csrfHeaderMatchesCookie,
  parseCookies,
  readAdminCsrfCookie,
} from '../modules/admin/admin-cookie.js'
import { writeAdminAudit } from '../modules/admin/admin-audit.js'

export type AdminAuthedRequest = Request & {
  userId?: string
  sessionId?: string
  userRole?: 'traveler' | 'admin'
  isAdminSession?: boolean
  adminRawToken?: string
}

/**
 * Router-level administrator protection.
 * Accepts only the HttpOnly admin session cookie — never traveler Bearer tokens or client-side storage.
 */
export function requireAdminSession(env: Env) {
  return async (req: AdminAuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const cookies = parseCookies(req.headers.cookie)
      const raw = cookies[env.ADMIN_SESSION_COOKIE_NAME]?.trim()
      if (!raw) {
        throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
      }

      const tokenHash = hashToken(raw)
      const session = await prisma.session.findUnique({ where: { tokenHash } })
      if (!session || !session.isAdminSession) {
        throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
      }
      if (session.revokedAt) {
        throw new AppError(401, 'SESSION_REVOKED', 'Your session is no longer valid. Sign in again.')
      }
      if (session.expiresAt.getTime() <= Date.now()) {
        throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again.')
      }

      const idleMs = env.ADMIN_SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000
      const last = session.lastSeenAt?.getTime() ?? session.createdAt.getTime()
      if (Date.now() - last > idleMs) {
        await prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date(), revokedReason: 'admin_idle_timeout' },
        })
        throw new AppError(401, 'SESSION_IDLE', 'Your session expired due to inactivity. Sign in again.')
      }

      const user = await prisma.user.findUnique({ where: { id: session.userId } })
      if (!user || user.role !== 'admin') {
        if (user && user.role !== 'admin') {
          await prisma.session.updateMany({
            where: { userId: user.id, isAdminSession: true, revokedAt: null },
            data: { revokedAt: new Date(), revokedReason: 'admin_role_removed' },
          })
        }
        await writeAdminAudit({
          action: 'ADMIN_ACCESS_DENIED',
          outcome: 'denied',
          actorUserId: session.userId,
          actorSessionId: session.id,
          reason: 'not_admin',
        })
        throw new AppError(403, 'ADMIN_FORBIDDEN', 'Administrator access required')
      }
      if (
        user.accountStatus === 'disabled' ||
        user.accountStatus === 'deactivated' ||
        user.accountStatus === 'restricted' ||
        !user.emailVerifiedAt
      ) {
        await prisma.session.updateMany({
          where: { userId: user.id, isAdminSession: true, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: 'admin_account_ineligible' },
        })
        throw new AppError(403, 'ADMIN_FORBIDDEN', 'Administrator access required')
      }

      req.userId = user.id
      req.sessionId = session.id
      req.userRole = 'admin'
      req.isAdminSession = true
      req.adminRawToken = raw

      void touchSessionLastSeen(session.id, env.SESSION_LAST_SEEN_THROTTLE_SECONDS * 1000).catch(
        () => undefined,
      )
      next()
    } catch (err) {
      next(err)
    }
  }
}

/** Validate Origin for cookie-authenticated mutating admin requests. */
export function requireAdminMutationOrigin(env: Env) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        next()
        return
      }
      const origin = req.get('origin') || undefined
      if (origin) {
        if (!isTrustedAdminOrigin(env, origin)) {
          throw new AppError(403, 'CSRF_DENIED', 'Request origin is not allowed')
        }
        next()
        return
      }
      const referer = req.get('referer')
      if (referer) {
        try {
          const refOrigin = new URL(referer).origin
          if (isTrustedAdminOrigin(env, refOrigin)) {
            next()
            return
          }
        } catch {
          // fall through
        }
      }
      throw new AppError(403, 'CSRF_DENIED', 'Request origin is not allowed')
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Double-submit CSRF: require `X-CSRF-Token` to match the admin CSRF cookie.
 * Applied to authenticated mutating admin routes (not login — Origin covers that).
 */
export function requireAdminCsrf(env: Env) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        next()
        return
      }
      const header = req.get('x-csrf-token') || undefined
      const cookieToken = readAdminCsrfCookie(env, req.headers.cookie)
      if (!csrfHeaderMatchesCookie(header, cookieToken)) {
        throw new AppError(403, 'CSRF_DENIED', 'Missing or invalid CSRF token')
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
