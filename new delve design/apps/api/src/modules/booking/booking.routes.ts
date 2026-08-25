import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { createBookingController } from './booking.controller.js'

export function createBookingRouter(env: Env) {
  const router = Router()
  const c = createBookingController()
  const auth = requireAuth(env)

  router.post('/bookings', auth, (req, res, next) => void c.create(req, res, next))
  router.get('/me/bookings', auth, (req, res, next) => void c.listMine(req, res, next))
  router.get('/me/bookings/:bookingId', auth, (req, res, next) => void c.getMine(req, res, next))
  router.post('/me/bookings/:bookingId/cancel', auth, (req, res, next) => void c.cancelMine(req, res, next))

  router.get('/businesses/:businessId/bookings', auth, (req, res, next) => void c.listForBusiness(req, res, next))
  router.get('/businesses/:businessId/bookings/:bookingId', auth, (req, res, next) => void c.getForBusiness(req, res, next))
  router.post('/businesses/:businessId/bookings/:bookingId/confirm', auth, (req, res, next) => void c.confirm(req, res, next))
  router.post('/businesses/:businessId/bookings/:bookingId/complete', auth, (req, res, next) => void c.complete(req, res, next))
  router.post('/businesses/:businessId/bookings/:bookingId/cancel', auth, (req, res, next) => void c.cancelForBusiness(req, res, next))

  return router
}

export function createAdminBookingController() {
  return createBookingController()
}
