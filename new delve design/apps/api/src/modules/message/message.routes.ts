import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { createMessageController } from './message.controller.js'

export function createMessageRouter(_env: Env) {
  const router = Router()
  const c = createMessageController()
  const auth = requireAuth(_env)

  router.get('/conversations', auth, (req, res, next) => void c.list(req, res, next))
  router.post('/conversations', auth, (req, res, next) => void c.create(req, res, next))
  router.get('/conversations/:conversationId/messages', auth, (req, res, next) =>
    void c.messages(req, res, next),
  )
  router.post('/conversations/:conversationId/messages', auth, (req, res, next) =>
    void c.send(req, res, next),
  )
  router.post('/conversations/:conversationId/accept', auth, (req, res, next) =>
    void c.accept(req, res, next),
  )
  router.post('/conversations/:conversationId/decline', auth, (req, res, next) =>
    void c.decline(req, res, next),
  )
  router.post('/conversations/:conversationId/typing', auth, (req, res, next) =>
    void c.typing(req, res, next),
  )
  router.post('/conversations/:conversationId/read', auth, (req, res, next) =>
    void c.read(req, res, next),
  )
  router.post('/conversations/:conversationId/archive', auth, (req, res, next) =>
    void c.archive(req, res, next),
  )
  router.post('/conversations/:conversationId/unarchive', auth, (req, res, next) =>
    void c.unarchive(req, res, next),
  )
  router.patch('/conversations/:conversationId/mute', auth, (req, res, next) =>
    void c.mute(req, res, next),
  )
  router.post('/journeys/:journeyId/conversation', auth, (req, res, next) =>
    void c.journeyConversation(req, res, next),
  )
  router.post('/communities/:communityId/conversation', auth, (req, res, next) =>
    void c.communityConversation(req, res, next),
  )
  router.get('/messages/stream', auth, (req, res, next) => void c.stream(req, res, next))
  router.get('/blocks', auth, (req, res, next) => void c.blocks(req, res, next))
  router.post('/users/:userId/block', auth, (req, res, next) => void c.block(req, res, next))
  router.delete('/users/:userId/block', auth, (req, res, next) => void c.unblock(req, res, next))

  return router
}
