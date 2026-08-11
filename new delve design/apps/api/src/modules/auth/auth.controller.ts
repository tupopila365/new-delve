import type { NextFunction, Request, Response } from 'express'
import {
  changeUsernameBodySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
  resendVerificationBodySchema,
  resetPasswordBodySchema,
  usernameAvailabilityQuerySchema,
  verifyEmailQuerySchema,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import { resolveApproximateGeo } from './geo.js'
import {
  changeUsername,
  checkUsernameAvailability,
  getUsernameChangeStatus,
  inspectPasswordResetToken,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmailToken,
} from './auth.service.js'

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0]!.trim()
  return req.ip || 'unknown'
}

function parseOrThrow<T>(
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { flatten: () => unknown } } },
  value: unknown,
): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', parsed.error.flatten())
  }
  return parsed.data
}

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data, meta: { timestamp: new Date().toISOString() } })
}

export function createAuthController(env: Env) {
  return {
    async register(req: Request, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(registerBodySchema, req.body)
        const data = await registerUser(env, body)
        ok(res, data, 201)
      } catch (err) {
        next(err)
      }
    },

    async usernameAvailability(req: Request, res: Response, next: NextFunction) {
      try {
        const query = parseOrThrow(usernameAvailabilityQuerySchema, req.query)
        const data = await checkUsernameAvailability(query.username, clientIp(req))
        ok(res, data)
      } catch (err) {
        next(err)
      }
    },

    async resendVerification(req: Request, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(resendVerificationBodySchema, req.body)
        const data = await resendVerification(env, body.email, clientIp(req))
        ok(res, data)
      } catch (err) {
        next(err)
      }
    },

    async verifyEmail(req: Request, res: Response, next: NextFunction) {
      try {
        const query = parseOrThrow(verifyEmailQuerySchema, req.query)
        const data = await verifyEmailToken(query.token)
        const wantsHtml = (req.headers.accept || '').includes('text/html')
        if (wantsHtml) {
          const dest = `${env.TRAVELER_WEB_URL.replace(/\/$/, '')}/verify-email?result=${encodeURIComponent(data.result)}`
          res.redirect(302, dest)
          return
        }
        const httpStatus =
          data.result === 'success' || data.result === 'already_verified'
            ? 200
            : data.result === 'account_disabled'
              ? 403
              : 400
        if (httpStatus !== 200) {
          throw new AppError(httpStatus, data.result.toUpperCase(), data.message)
        }
        ok(res, data)
      } catch (err) {
        next(err)
      }
    },

    async login(req: Request, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(loginBodySchema, req.body)
        const data = await loginUser(env, body, clientIp(req), {
          userAgent:
            typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
          geo: resolveApproximateGeo(req, env),
        })
        ok(res, data)
      } catch (err) {
        next(err)
      }
    },

    async refresh(req: Request, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(refreshBodySchema, req.body)
        const data = await refreshSession(env, body.refreshToken, {
          userAgent:
            typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
          geo: resolveApproximateGeo(req, env),
        })
        ok(res, data)
      } catch (err) {
        next(err)
      }
    },

    async logout(req: Request, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(refreshBodySchema, req.body)
        const data = await logoutSession(body.refreshToken)
        ok(res, data)
      } catch (err) {
        next(err)
      }
    },

    async forgotPassword(req: Request, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(forgotPasswordBodySchema, req.body)
        ok(res, await requestPasswordReset(env, body.email, clientIp(req)))
      } catch (err) {
        next(err)
      }
    },

    async resetPassword(req: Request, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(resetPasswordBodySchema, req.body)
        const data = await resetPassword(env, { token: body.token, newPassword: body.newPassword })
        if (data.result !== 'success') {
          throw new AppError(400, data.result.toUpperCase(), data.message)
        }
        ok(res, data)
      } catch (err) {
        next(err)
      }
    },

    async inspectResetToken(req: Request, res: Response, next: NextFunction) {
      try {
        const token = String(req.query.token || '')
        if (!token) throw new AppError(400, 'VALIDATION_ERROR', 'Reset token is required')
        ok(res, await inspectPasswordResetToken(token))
      } catch (err) {
        next(err)
      }
    },

    async changeUsername(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
        const body = parseOrThrow(changeUsernameBodySchema, req.body)
        const data = await changeUsername(env, req.userId, body)
        ok(res, data)
      } catch (err) {
        next(err)
      }
    },

    async usernameChangeStatus(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
        const data = await getUsernameChangeStatus(req.userId)
        ok(res, data)
      } catch (err) {
        next(err)
      }
    },
  }
}
