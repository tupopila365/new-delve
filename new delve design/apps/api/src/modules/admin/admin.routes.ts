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
import { createAdminDealController } from '../deal/deal.controller.js'
import { createBookingController } from '../booking/booking.controller.js'
import { createPaymentController } from '../payment/payment.controller.js'

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
  const deals = createAdminDealController()
  const bookings = createBookingController()
  const payments = createPaymentController(env)

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

  router.get('/deals', (req, res, next) => void deals.list(req, res, next))
  router.post('/deals/:id/moderate', (req, res, next) => void deals.moderate(req, res, next))
  router.patch('/deals/:id/featured', (req, res, next) => void deals.feature(req, res, next))
  router.get('/deal-reports', (req, res, next) => void deals.reports(req, res, next))
  router.post('/deal-reports/:reportId', (req, res, next) => void deals.resolveReport(req, res, next))
  router.get('/deal-analytics', (req, res, next) => void deals.analytics(req, res, next))
  router.get('/bookings', (req, res, next) => void bookings.adminList(req, res, next))
  router.get('/bookings/:bookingId', (req, res, next) => void bookings.adminGet(req, res, next))
  router.get('/settlements', (req, res, next) => void payments.adminList(req, res, next))
  router.get('/settlements/:payableId', (req, res, next) => void payments.adminGet(req, res, next))
  router.post('/settlements/:payableId/release', (req, res, next) => void payments.adminRelease(req, res, next))
  router.get('/refunds', (req, res, next) => void payments.adminListRefunds(req, res, next))
  router.get('/refunds/:refundId', (req, res, next) => void payments.adminGetRefund(req, res, next))
  router.post('/refunds/:refundId/issue', (req, res, next) => void payments.adminIssueRefund(req, res, next))
  router.post('/refunds/:refundId/reverse-and-continue', (req, res, next) => void payments.adminReverseAndContinue(req, res, next))
  router.get('/cancellation-requests', (req, res, next) => void payments.adminListCancellations(req, res, next))
  router.post('/cancellation-requests/:requestId/approve', (req, res, next) => void payments.adminApproveCancellation(req, res, next))
  router.post('/cancellation-requests/:requestId/reject', (req, res, next) => void payments.adminRejectCancellation(req, res, next))

  return router
}
