import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { optionalAuth } from '../../middleware/require-auth.js'
import { createSearchController } from './search.controller.js'

export function createSearchRouter(env: Env) {
  const router = Router()
  const c = createSearchController(env)
  const soft = optionalAuth(env)

  router.get('/search', soft, (req, res, next) => void c.search(req, res, next))
  router.get('/search/suggest', soft, (req, res, next) => void c.suggest(req, res, next))

  return router
}
