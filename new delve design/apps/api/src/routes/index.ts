import { Router } from 'express'
import { API_V2_PREFIX } from '@delve/config'
import type { Env } from '../config/env.js'
import { healthRouter } from '../modules/health/health.routes.js'
import { createAuthRouter, createUsersRouter } from '../modules/auth/auth.routes.js'
import { createMediaRouter } from '../modules/media/media.routes.js'
import { createAdminRouter } from '../modules/admin/admin.routes.js'
import { createSocialRouter } from '../modules/social/social.routes.js'
import { createBusinessRouter } from '../modules/business/business.routes.js'
import { createListingRouter } from '../modules/listing/listing.routes.js'
import { createDealRouter } from '../modules/deal/deal.routes.js'
import { createBookingRouter } from '../modules/booking/booking.routes.js'
import { createPaymentRouter, createReconciliationJobRouter } from '../modules/payment/payment.routes.js'
import { createCommunityRouter } from '../modules/community/community.routes.js'
import { createJourneyRouter } from '../modules/journey/journey.routes.js'
import { createMessageRouter } from '../modules/message/message.routes.js'
import { createSearchRouter } from '../modules/search/search.routes.js'
import { configureLastSeenThrottle } from '../modules/auth/session.js'

export function createApiRouter(env: Env) {
  configureLastSeenThrottle(env.SESSION_LAST_SEEN_THROTTLE_SECONDS * 1000)
  const router = Router()
  router.use(`${API_V2_PREFIX}/health`, healthRouter)
  router.use(`${API_V2_PREFIX}/auth`, createAuthRouter(env))
  router.use(`${API_V2_PREFIX}/users`, createUsersRouter(env))
  router.use(`${API_V2_PREFIX}/media`, createMediaRouter(env))
  router.use(`${API_V2_PREFIX}/businesses`, createBusinessRouter(env))
  router.use(API_V2_PREFIX, createListingRouter(env))
  router.use(API_V2_PREFIX, createDealRouter(env))
  router.use(API_V2_PREFIX, createBookingRouter(env))
  router.use(API_V2_PREFIX, createPaymentRouter(env))
  router.use(`${API_V2_PREFIX}/internal`, createReconciliationJobRouter(env))
  router.use(API_V2_PREFIX, createSocialRouter(env))
  router.use(API_V2_PREFIX, createCommunityRouter(env))
  router.use(API_V2_PREFIX, createJourneyRouter(env))
  router.use(API_V2_PREFIX, createSearchRouter(env))
  router.use(API_V2_PREFIX, createMessageRouter(env))
  // Admin surface: deny travelers by default (requireAuth + requireAdmin on nested routes).
  router.use(`${API_V2_PREFIX}/admin`, createAdminRouter(env))
  return router
}