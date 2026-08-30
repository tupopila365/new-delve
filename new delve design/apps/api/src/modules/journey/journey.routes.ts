import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { requireAuth, optionalAuth } from '../../middleware/require-auth.js'
import { createJourneyController } from './journey.controller.js'

export function createJourneyRouter(_env: Env) {
  const router = Router()
  const c = createJourneyController()
  const auth = requireAuth(_env)
  const soft = optionalAuth(_env)

  router.get('/users/:username/journeys', soft, (req, res, next) => void c.userJourneys(req, res, next))
  router.get('/journeys', soft, (req, res, next) => void c.list(req, res, next))
  router.get('/journeys/mine', auth, (req, res, next) => void c.mine(req, res, next))
  router.post('/journeys', auth, (req, res, next) => void c.create(req, res, next))

  // Personalisation — must be before /:journeyId to avoid route shadowing
  router.get('/journeys/mine/personalisation', auth, (req, res, next) => void c.listPersonalisations(req, res, next))
  router.patch('/journeys/mine/order', auth, (req, res, next) => void c.patchMyJourneyOrder(req, res, next))
  router.patch('/journeys/:journeyId/personalisation', auth, (req, res, next) => void c.patchPersonalisation(req, res, next))

  router.patch('/journeys/:journeyId', auth, (req, res, next) => void c.update(req, res, next))
  router.put('/journeys/:journeyId/stops/reorder', auth, (req, res, next) => void c.reorderStops(req, res, next))
  router.post('/journeys/:journeyId/collaborators', auth, (req, res, next) => void c.addCollaborator(req, res, next))
  router.delete('/journeys/:journeyId/collaborators/:userId', auth, (req, res, next) => void c.removeCollaborator(req, res, next))
  router.post('/journeys/:journeyId/fork', auth, (req, res, next) => void c.fork(req, res, next))
  router.patch('/journeys/:journeyId/cover', auth, (req, res, next) => void c.updateCover(req, res, next))
  router.get('/journeys/:journeyId/comments', soft, (req, res, next) => void c.listComments(req, res, next))
  router.post('/journeys/:journeyId/comments', auth, (req, res, next) => void c.addComment(req, res, next))
  router.delete('/journey-comments/:commentId', auth, (req, res, next) => void c.deleteComment(req, res, next))
  router.post('/journeys/:journeyId/reactions', auth, (req, res, next) => void c.like(req, res, next))
  router.delete('/journeys/:journeyId/reactions', auth, (req, res, next) => void c.unlike(req, res, next))
  router.post('/journeys/:journeyId/events', auth, (req, res, next) => void c.addEvent(req, res, next))
  router.delete('/journeys/:journeyId/events/:eventId', auth, (req, res, next) => void c.removeEvent(req, res, next))
  router.post('/journeys/:journeyId/deals', auth, (req, res, next) => void c.addDeal(req, res, next))
  router.delete('/journeys/:journeyId/deals/:dealId', auth, (req, res, next) => void c.removeDeal(req, res, next))
  router.post('/journeys/:journeyId/bookings', auth, (req, res, next) => void c.addBooking(req, res, next))
  router.delete('/journeys/:journeyId/bookings/:bookingId', auth, (req, res, next) => void c.removeBooking(req, res, next))
  router.get('/journeys/:slugOrId', soft, (req, res, next) => void c.get(req, res, next))

  return router
}
