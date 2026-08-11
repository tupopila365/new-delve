import type { NextFunction, Request, Response } from 'express'
import { prisma } from '@delve/database'
import type { Env } from '../config/env.js'
import { AppError } from './error-handler.js'
import { verifyAccessToken } from '../modules/auth/crypto.js'
import { touchSessionLastSeen } from '../modules/auth/session.js'

export type AuthedRequest = Request & {
  userId?: string
  sessionId?: string
  userRole?: 'traveler' | 'admin'
  isAdminSession?: boolean
}

export function requireAuth(env: Env) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization
      if (!header?.startsWith('Bearer ')) {
        throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
      }
      const token = header.slice('Bearer '.length).trim()
      const payload = await verifyAccessToken(env, token)
      if (!payload?.sessionId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
      }

      const session = await prisma.session.findUnique({ where: { id: payload.sessionId } })
      if (!session || session.userId !== payload.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
      }
      if (session.revokedAt) {
        throw new AppError(401, 'SESSION_REVOKED', 'Your session is no longer valid. Sign in again.')
      }
      if (session.expiresAt.getTime() <= Date.now()) {
        throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again.')
      }

      const user = await prisma.user.findUnique({ where: { id: payload.userId } })
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
      }
      if (
        user.accountStatus === 'disabled' ||
        user.accountStatus === 'deactivated' ||
        user.accountStatus === 'restricted'
      ) {
        throw new AppError(403, 'ACCOUNT_RESTRICTED', 'This account cannot access Delve right now.')
      }

      req.userId = payload.userId
      req.sessionId = payload.sessionId
      req.userRole = user.role
      req.isAdminSession = session.isAdminSession

      void touchSessionLastSeen(payload.sessionId, env.SESSION_LAST_SEEN_THROTTLE_SECONDS * 1000).catch(
        () => undefined,
      )
      next()
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Administrator routes require a valid admin role AND an admin-issued session.
 * Mount under `/api/v2/admin` so new admin routes inherit this by default.
 */
export function requireAdmin() {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.userId || !req.sessionId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
      }
      if (req.userRole !== 'admin' || !req.isAdminSession) {
        throw new AppError(403, 'ADMIN_FORBIDDEN', 'Administrator access required')
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
