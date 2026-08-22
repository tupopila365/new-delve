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
  router.patch('/journeys/:journeyId', auth, (req, res, next) => void c.update(req, res, next))
  router.patch('/journeys/:journeyId/cover', auth, (req, res, next) => void c.updateCover(req, res, next))
  router.get('/journeys/:journeyId/comments', soft, (req, res, next) => void c.listComments(req, res, next))
  router.post('/journeys/:journeyId/comments', auth, (req, res, next) => void c.addComment(req, res, next))
  router.delete('/journey-comments/:commentId', auth, (req, res, next) => void c.deleteComment(req, res, next))
  router.post('/journeys/:journeyId/reactions', auth, (req, res, next) => void c.like(req, res, next))
  router.delete('/journeys/:journeyId/reactions', auth, (req, res, next) => void c.unlike(req, res, next))
  router.get('/journeys/:slugOrId', soft, (req, res, next) => void c.get(req, res, next))

  return router
}
