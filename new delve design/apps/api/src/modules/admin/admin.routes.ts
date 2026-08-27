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
import { createAdminMarketplaceController } from './admin-marketplace.controller.js'
import { createAdminTravelersController } from './admin-travelers.controller.js'
import { createAdminModerationController } from './admin-moderation.controller.js'

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
  const marketplace = createAdminMarketplaceController(env)
  const travelers = createAdminTravelersController()
  const moderation = createAdminModerationController()

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

  router.get('/ops/marketplace-summary', (req, res, next) => void marketplace.opsSummary(req, res, next))
  router.get('/ops/traveler-summary', (req, res, next) => void travelers.opsSummary(req, res, next))
  router.get('/ops/moderation-summary', (req, res, next) => void moderation.opsSummary(req, res, next))
  router.get('/moderation/queue', (req, res, next) => void moderation.queue(req, res, next))
  router.get('/moderation/posts', (req, res, next) => void moderation.posts(req, res, next))
  router.get('/moderation/events', (req, res, next) => void moderation.events(req, res, next))
  router.get('/moderation/journeys', (req, res, next) => void moderation.journeys(req, res, next))
  router.get('/moderation/comments', (req, res, next) => void moderation.comments(req, res, next))
  router.get('/moderation/communities', (req, res, next) => void moderation.communities(req, res, next))
  router.get('/moderation/cases/:targetType/:targetId', (req, res, next) => void moderation.getCase(req, res, next))
  router.post('/moderation/cases/:targetType/:targetId/decide', (req, res, next) => void moderation.decide(req, res, next))
  router.get('/travelers', (req, res, next) => void travelers.list(req, res, next))
  router.get('/travelers/:userId/bookings', (req, res, next) => void travelers.bookings(req, res, next))
  router.get('/travelers/:userId/claims', (req, res, next) => void travelers.claims(req, res, next))
  router.get('/travelers/:userId/journeys', (req, res, next) => void travelers.journeys(req, res, next))
  router.get('/travelers/:userId/events', (req, res, next) => void travelers.events(req, res, next))
  router.get('/travelers/:userId/communities', (req, res, next) => void travelers.communities(req, res, next))
  router.get('/travelers/:userId/safety', (req, res, next) => void travelers.safety(req, res, next))
  router.get('/travelers/:userId/activity', (req, res, next) => void travelers.activity(req, res, next))
  router.get('/travelers/:userId/financial', (req, res, next) => void travelers.financial(req, res, next))
  router.post('/travelers/:userId/restrict', (req, res, next) => void travelers.restrict(req, res, next))
  router.post('/travelers/:userId/restore', (req, res, next) => void travelers.restore(req, res, next))
  router.get('/travelers/:userId', (req, res, next) => void travelers.get(req, res, next))
  router.get('/businesses', (req, res, next) => void marketplace.listBusinesses(req, res, next))
  router.get('/businesses/:businessId', (req, res, next) => void marketplace.getBusiness(req, res, next))
  router.get('/businesses/:businessId/members', (req, res, next) => void marketplace.listMembers(req, res, next))
  router.get('/businesses/:businessId/deals', (req, res, next) => void marketplace.listBusinessDeals(req, res, next))
  router.get('/businesses/:businessId/bookings', (req, res, next) => void marketplace.listBusinessBookings(req, res, next))
  router.get('/businesses/:businessId/finance', (req, res, next) => void marketplace.finance(req, res, next))
  router.get('/businesses/:businessId/activity', (req, res, next) => void marketplace.activity(req, res, next))
  router.post('/businesses/:businessId/verify', (req, res, next) => void marketplace.verify(req, res, next))
  router.post('/businesses/:businessId/reject-verification', (req, res, next) => void marketplace.rejectVerification(req, res, next))
  router.post('/businesses/:businessId/refresh-connect', (req, res, next) => void marketplace.refreshConnect(req, res, next))
  router.get('/listings', (req, res, next) => void marketplace.listListings(req, res, next))
  router.get('/listings/:listingId', (req, res, next) => void marketplace.getListing(req, res, next))

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
  router.get('/disputes', (req, res, next) => void payments.adminListDisputes(req, res, next))
  router.get('/disputes/:id', (req, res, next) => void payments.adminGetDispute(req, res, next))
  router.post('/disputes/:id/submit-evidence', (req, res, next) => void payments.adminSubmitDisputeEvidence(req, res, next))
  router.post('/disputes/:id/recover-settlement', (req, res, next) => void payments.adminRecoverDispute(req, res, next))
  router.get('/reconciliation/summary', (req, res, next) => void payments.reconSummary(req, res, next))
  router.get('/reconciliation/issues', (req, res, next) => void payments.reconListIssues(req, res, next))
  router.get('/reconciliation/issues/:id', (req, res, next) => void payments.reconGetIssue(req, res, next))
  router.post('/reconciliation/issues/:id/resolve', (req, res, next) => void payments.reconResolveIssue(req, res, next))
  router.post('/reconciliation/run', (req, res, next) => void payments.reconRun(req, res, next))
  router.post('/reconciliation/bookings/:bookingId', (req, res, next) => void payments.reconBooking(req, res, next))
  router.get('/reconciliation/unmatched', (req, res, next) => void payments.reconUnmatched(req, res, next))
  router.post('/reconciliation/unmatched/:id/retry-match', (req, res, next) => void payments.reconRetryUnmatched(req, res, next))
  router.post('/reconciliation/unmatched/:id/mark-reviewed', (req, res, next) => void payments.reconMarkUnmatched(req, res, next))
  router.get('/reconciliation/recovery-cases', (req, res, next) => void payments.reconListRecovery(req, res, next))
  router.get('/reconciliation/recovery-cases/:id', (req, res, next) => void payments.reconGetRecovery(req, res, next))
  router.post('/reconciliation/recovery-cases/:id/resolve', (req, res, next) => void payments.reconResolveRecovery(req, res, next))
  router.get('/reports/summary', (req, res, next) => void payments.adminReportSummary(req, res, next))
  router.get('/reports/trend', (req, res, next) => void payments.adminReportTrend(req, res, next))
  router.get('/reports/businesses', (req, res, next) => void payments.adminReportBusinesses(req, res, next))
  router.get('/reports/bookings', (req, res, next) => void payments.adminReportBookings(req, res, next))
  router.get('/reports/bookings/:bookingId', (req, res, next) => void payments.adminReportBookingFinancial(req, res, next))
  router.get('/reports/daily', (req, res, next) => void payments.adminReportDaily(req, res, next))
  router.get('/reports/monthly', (req, res, next) => void payments.adminReportMonthly(req, res, next))
  router.get('/reports/export/:kind', (req, res, next) => void payments.adminReportExport(req, res, next))

  return router
}
