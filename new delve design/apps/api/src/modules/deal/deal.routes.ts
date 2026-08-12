import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { optionalAuth, requireAuth } from '../../middleware/require-auth.js'
import { createDealController } from './deal.controller.js'

export function createDealRouter(env: Env) {
  const router = Router()
  const c = createDealController()
  const auth = requireAuth(env)
  const soft = optionalAuth(env)

  router.get('/deals/public', soft, (req, res, next) => void c.listPublic(req, res, next))
  router.get('/deals/public/:id', soft, (req, res, next) => void c.getPublic(req, res, next))

  router.post('/businesses/:businessId/deals', auth, (req, res, next) => void c.create(req, res, next))
  router.get('/businesses/:businessId/deals', auth, (req, res, next) => void c.listForBusiness(req, res, next))
  router.get('/deals/:id', auth, (req, res, next) => void c.getOne(req, res, next))
  router.patch('/deals/:id', auth, (req, res, next) => void c.update(req, res, next))

  return router
}
