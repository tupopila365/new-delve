import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { createPaymentController } from './payment.controller.js'

export function createPaymentRouter(env: Env) {
  const router = Router()
  const c = createPaymentController(env)
  const auth = requireAuth(env)

  router.post('/businesses/:businessId/payments/connect/onboard', auth, (req, res, next) => void c.onboard(req, res, next))
  router.get('/businesses/:businessId/payments/connect/status', auth, (req, res, next) => void c.connectStatus(req, res, next))
  router.get('/businesses/:businessId/payments/earnings', auth, (req, res, next) => void c.earnings(req, res, next))
  router.post('/bookings/:bookingId/payments', auth, (req, res, next) => void c.createForBooking(req, res, next))
  router.post('/bookings/:bookingId/cancellation-requests', auth, (req, res, next) => void c.requestCancellation(req, res, next))
  router.post(
    '/businesses/:businessId/bookings/:bookingId/cancellation-requests',
    auth,
    (req, res, next) => void c.requestProviderCancellation(req, res, next),
  )
  router.get('/bookings/:bookingId/payments/:paymentId', auth, (req, res, next) => void c.getMine(req, res, next))

  return router
}

export function createStripeWebhookRouter(env: Env) {
  const router = Router()
  const c = createPaymentController(env)
  router.post('/', (req, res, next) => void c.webhook(req, res, next))
  return router
}
