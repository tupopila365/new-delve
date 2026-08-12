import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { optionalAuth, requireAuth } from '../../middleware/require-auth.js'
import { createListingController } from './listing.controller.js'

export function createListingRouter(env: Env) {
  const router = Router()
  const c = createListingController(env)
  const auth = requireAuth(env)
  const soft = optionalAuth(env)

  router.post('/businesses/:businessId/listings', auth, (req, res, next) => void c.create(req, res, next))
  router.get('/businesses/:businessId/listings/public', soft, (req, res, next) => void c.listPublicForBusiness(req, res, next))
  router.get('/businesses/:businessId/listings', auth, (req, res, next) => void c.listForBusiness(req, res, next))
  router.get('/listings/public', soft, (req, res, next) => void c.listPublic(req, res, next))
  router.get('/listings/:id', auth, (req, res, next) => void c.getOne(req, res, next))
  router.get('/listings/:id/public', soft, (req, res, next) => void c.getPublic(req, res, next))
  router.patch('/listings/:id', auth, (req, res, next) => void c.update(req, res, next))

  return router
}
