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
  router.post('/businesses/:businessId/deals/price-preview', auth, (req, res, next) => void c.previewPrice(req, res, next))
  router.get('/businesses/:businessId/deals', auth, (req, res, next) => void c.listForBusiness(req, res, next))
  router.get('/businesses/:businessId/deal-claims/lookup', auth, (req, res, next) => void c.lookupClaim(req, res, next))
  router.post('/businesses/:businessId/deal-claims/:claimId/redeem', auth, (req, res, next) => void c.redeemClaim(req, res, next))
  router.get('/businesses/:businessId/deal-claims', auth, (req, res, next) => void c.listClaims(req, res, next))
  router.patch('/deal-claims/:claimId', auth, (req, res, next) => void c.updateClaim(req, res, next))

  router.get('/me/deal-claims', auth, (req, res, next) => void c.listMyClaims(req, res, next))
  router.get('/me/deal-claims/:claimId', auth, (req, res, next) => void c.getMyClaim(req, res, next))
  router.post('/deals/:id/claims', auth, (req, res, next) => void c.claim(req, res, next))
  router.get('/deals/:id/claims/me', auth, (req, res, next) => void c.myClaim(req, res, next))
  router.post('/deals/:id/reports', auth, (req, res, next) => void c.report(req, res, next))
  router.post('/deals/:id/analytics', soft, (req, res, next) => void c.analytics(req, res, next))

  router.get('/deals/:id', auth, (req, res, next) => void c.getOne(req, res, next))
  router.patch('/deals/:id', auth, (req, res, next) => void c.update(req, res, next))

  return router
}
