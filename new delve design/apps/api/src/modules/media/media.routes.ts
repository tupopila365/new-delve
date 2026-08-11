import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { createMediaController } from './media.controller.js'

export function createMediaRouter(env: Env) {
  const router = Router()
  const controller = createMediaController(env)
  const auth = requireAuth(env)

  // Architecture: metadata and signatures only. Never accept media file bodies on these routes.
  router.post('/upload-signature', auth, (req, res, next) => void controller.uploadSignature(req, res, next))
  router.post('/complete', auth, (req, res, next) => void controller.complete(req, res, next))
  router.delete('/:mediaId', auth, (req, res, next) => void controller.remove(req, res, next))
  router.post('/ops/cleanup', auth, (req, res, next) => void controller.cleanup(req, res, next))

  return router
}

export function createCloudinaryWebhookRouter(env: Env) {
  const router = Router()
  const controller = createMediaController(env)
  router.post('/', (req, res, next) => void controller.webhook(req, res, next))
  return router
}
