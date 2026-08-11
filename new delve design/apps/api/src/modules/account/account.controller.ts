import type { NextFunction, Response } from 'express'
import {
  avatarUploadUrlBodySchema,
  changePasswordBodySchema,
  deactivateBodySchema,
  emailChangeBodySchema,
  emailChangeVerifyBodySchema,
  notificationPreferencesPatchSchema,
  onboardingCompleteSchema,
  onboardingPatchSchema,
  profileUpdateSchema,
  refreshBodySchema,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as account from './account.service.js'

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

function clientIp(req: AuthedRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0]!.trim()
  return req.ip || 'unknown'
}

function requireUserId(req: AuthedRequest) {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  return req.userId
}

export function createAccountController(env: Env) {
  return {
    async getOnboarding(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await account.getOnboarding(env, requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async patchOnboarding(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(onboardingPatchSchema, req.body)
        ok(res, await account.patchOnboarding(env, requireUserId(req), body))
      } catch (err) {
        next(err)
      }
    },
    async completeOnboarding(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(onboardingCompleteSchema, req.body)
        ok(res, await account.completeOnboarding(env, requireUserId(req), body))
      } catch (err) {
        next(err)
      }
    },
    async getProfile(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await account.getProfile(env, requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(profileUpdateSchema, req.body)
        ok(res, await account.updateProfile(env, requireUserId(req), body))
      } catch (err) {
        next(err)
      }
    },
    async avatarUploadUrl(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(avatarUploadUrlBodySchema, req.body)
        ok(res, await account.createAvatarUploadUrl(env, requireUserId(req), body, clientIp(req)))
      } catch (err) {
        next(err)
      }
    },
    async deleteAvatar(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await account.deleteAvatar(env, requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async requestEmailChange(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(emailChangeBodySchema, req.body)
        ok(res, await account.requestEmailChange(env, requireUserId(req), body, clientIp(req)))
      } catch (err) {
        next(err)
      }
    },
    async verifyEmailChange(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(emailChangeVerifyBodySchema, req.body)
        ok(res, await account.verifyEmailChange(env, body.token))
      } catch (err) {
        next(err)
      }
    },
    async resendEmailChange(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await account.resendEmailChange(env, requireUserId(req), clientIp(req)))
      } catch (err) {
        next(err)
      }
    },
    async cancelEmailChange(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await account.cancelEmailChange(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async changePassword(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(changePasswordBodySchema, req.body)
        const refresh =
          typeof req.body?.currentRefreshToken === 'string'
            ? req.body.currentRefreshToken
            : typeof req.headers['x-refresh-token'] === 'string'
              ? req.headers['x-refresh-token']
              : undefined
        ok(
          res,
          await account.changePassword(
            env,
            requireUserId(req),
            { currentPassword: body.currentPassword, newPassword: body.newPassword },
            refresh,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async listSessions(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const refresh =
          typeof req.headers['x-refresh-token'] === 'string' ? req.headers['x-refresh-token'] : undefined
        ok(res, await account.listSessions(requireUserId(req), refresh))
      } catch (err) {
        next(err)
      }
    },
    async revokeSession(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const sessionId = String(req.params.sessionId || '')
        const refresh =
          typeof req.headers['x-refresh-token'] === 'string' ? req.headers['x-refresh-token'] : undefined
        const result = await account.revokeSession(requireUserId(req), sessionId, refresh)
        ok(res, result)
      } catch (err) {
        next(err)
      }
    },
    async getPreferences(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await account.getPreferences(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async updatePreferences(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(notificationPreferencesPatchSchema, req.body)
        ok(res, await account.updatePreferences(requireUserId(req), body))
      } catch (err) {
        next(err)
      }
    },
    async deactivate(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(deactivateBodySchema, req.body)
        ok(res, await account.deactivateAccount(requireUserId(req), body.currentPassword))
      } catch (err) {
        next(err)
      }
    },
    async logoutAll(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await account.logoutAll(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async logoutOthers(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(refreshBodySchema, req.body)
        ok(res, await account.logoutOthers(requireUserId(req), body.refreshToken))
      } catch (err) {
        next(err)
      }
    },
  }
}
