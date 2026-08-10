import { Router } from 'express'
import { API_V2_PREFIX } from '@delve/config'
import { healthRouter } from '../modules/health/health.routes.js'

export function createApiRouter() {
  const router = Router()
  router.use(`${API_V2_PREFIX}/health`, healthRouter)
  return router
}
