import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { optionalAuth, requireAuth } from '../../middleware/require-auth.js'
import { createBusinessController } from './business.controller.js'

export function createBusinessRouter(env: Env) {
  const router = Router()
  const c = createBusinessController()
  const auth = requireAuth(env)
  const soft = optionalAuth(env)

  router.post('/', auth, (req, res, next) => void c.create(req, res, next))
  router.get('/me', auth, (req, res, next) => void c.listMine(req, res, next))
  router.get('/me/dashboard', auth, (req, res, next) => void c.dashboard(req, res, next))
  /** Public profile — must be registered before `/:id`. */
  router.get('/public/:slug', soft, (req, res, next) => void c.getPublic(req, res, next))
  router.get('/:id', auth, (req, res, next) => void c.getOne(req, res, next))
  router.patch('/:id', auth, (req, res, next) => void c.update(req, res, next))

  return router
}
