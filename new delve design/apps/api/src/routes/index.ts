import { Router } from 'express'
import { API_V2_PREFIX } from '@delve/config'
import type { Env } from '../config/env.js'
import { healthRouter } from '../modules/health/health.routes.js'
import { createAuthRouter, createUsersRouter } from '../modules/auth/auth.routes.js'
import { createMediaRouter } from '../modules/media/media.routes.js'
import { createAdminRouter } from '../modules/admin/admin.routes.js'
import { createSocialRouter } from '../modules/social/social.routes.js'
import { configureLastSeenThrottle } from '../modules/auth/session.js'

export function createApiRouter(env: Env) {
  configureLastSeenThrottle(env.SESSION_LAST_SEEN_THROTTLE_SECONDS * 1000)
  const router = Router()
  router.use(`${API_V2_PREFIX}/health`, healthRouter)
  router.use(`${API_V2_PREFIX}/auth`, createAuthRouter(env))
  router.use(`${API_V2_PREFIX}/users`, createUsersRouter(env))
  router.use(`${API_V2_PREFIX}/media`, createMediaRouter(env))
  router.use(API_V2_PREFIX, createSocialRouter(env))
  // Admin surface: deny travelers by default (requireAuth + requireAdmin on nested routes).
  router.use(`${API_V2_PREFIX}/admin`, createAdminRouter(env))
  return router
}