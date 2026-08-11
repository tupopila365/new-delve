import { Router } from 'express'
import { adminLoginBodySchema } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import {
  requireAdminSession,
  requireAdminMutationOrigin,
  requireAdminCsrf,
  type AdminAuthedRequest,
} from '../../middleware/require-admin-session.js'
import { resolveApproximateGeo } from '../auth/geo.js'
import {
  adminLogin,
  adminLogout,
  adminLogoutAll,
  getAdminMe,
} from './admin.service.js'
import {
  clearAdminCsrfCookie,
  clearAdminSessionCookie,
  issueAdminCsrfToken,
  setAdminCsrfCookie,
  setAdminSessionCookie,
} from './admin-cookie.js'

/**
 * Admin API surface.
 * Only `/auth/login` is public. Every other route inherits cookie + admin checks.
 * Authenticated mutations also require a double-submit CSRF token.
 */
export function createAdminRouter(env: Env) {
  const router = Router()
  const guard = requireAdminSession(env)
  const originGuard = requireAdminMutationOrigin(env)
  const csrfGuard = requireAdminCsrf(env)

  router.post('/auth/login', originGuard, (req, res, next) => {
    void (async () => {
      const parsed = adminLoginBodySchema.safeParse(req.body)
      if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid sign-in details', parsed.error.flatten())
      }
      const geo = resolveApproximateGeo(req, env)
      const result = await adminLogin(env, parsed.data, req.ip || '0.0.0.0', {
        userAgent: req.get('user-agent') || undefined,
        geo,
      })
      const csrfToken = issueAdminCsrfToken()
      setAdminSessionCookie(res, env, result.rawSessionToken)
      setAdminCsrfCookie(res, env, csrfToken)
      res.json({
        success: true,
        data: {
          user: result.user,
          session: {
            expiresAt: result.expiresAt.toISOString(),
            idleTimeoutMinutes: env.ADMIN_SESSION_IDLE_TIMEOUT_MINUTES,
          },
          csrfToken,
        },
      })
    })().catch(next)
  })

  // Deny-by-default for the rest of the admin surface.
  router.use(guard)
  router.use(originGuard)
  router.use(csrfGuard)

  router.get('/auth/me', (req: AdminAuthedRequest, res, next) => {
    void (async () => {
      const data = await getAdminMe(env, req.userId!, req.sessionId!)
      const csrfToken = issueAdminCsrfToken()
      setAdminCsrfCookie(res, env, csrfToken)
      res.json({ success: true, data: { ...data, csrfToken } })
    })().catch(next)
  })

  router.post('/auth/logout', (req: AdminAuthedRequest, res, next) => {
    void (async () => {
      const result = await adminLogout(req.sessionId, req.userId)
      clearAdminSessionCookie(res, env)
      clearAdminCsrfCookie(res, env)
      res.json({ success: true, data: result })
    })().catch(next)
  })

  router.post('/auth/logout-all', (req: AdminAuthedRequest, res, next) => {
    void (async () => {
      const result = await adminLogoutAll(req.userId!, req.sessionId)
      clearAdminSessionCookie(res, env)
      clearAdminCsrfCookie(res, env)
      res.json({ success: true, data: result })
    })().catch(next)
  })

  router.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', audience: 'admin' } })
  })

  return router
}
