import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { requireAuth, optionalAuth } from '../../middleware/require-auth.js'
import { createCommunityController } from './community.controller.js'

export function createCommunityRouter(_env: Env) {
  const router = Router()
  const c = createCommunityController()
  const auth = requireAuth(_env)
  const soft = optionalAuth(_env)

  router.post('/communities', auth, (req, res, next) => void c.create(req, res, next))
  router.get('/communities', soft, (req, res, next) => void c.list(req, res, next))
  router.get('/communities/mine', auth, (req, res, next) => void c.mine(req, res, next))
  router.get('/communities/threads', soft, (req, res, next) => void c.listThreads(req, res, next))

  router.get('/users/:username/communities', soft, (req, res, next) => void c.userCommunities(req, res, next))

  router.get('/communities/:communityId/threads', soft, (req, res, next) => void c.listCommunityThreads(req, res, next))
  router.post('/communities/:communityId/threads', auth, (req, res, next) => void c.createThread(req, res, next))

  router.get('/communities/:communityId/requests', auth, (req, res, next) => void c.listJoinRequests(req, res, next))
  router.post('/communities/:communityId/requests/:userId/approve', auth, (req, res, next) => void c.approveJoinRequest(req, res, next))
  router.post('/communities/:communityId/requests/:userId/deny', auth, (req, res, next) => void c.denyJoinRequest(req, res, next))

  router.get('/communities/:slugOrId', soft, (req, res, next) => void c.get(req, res, next))
  router.patch('/communities/:communityId', auth, (req, res, next) => void c.update(req, res, next))

  router.get('/communities/:communityId/rules', soft, (req, res, next) => void c.listRules(req, res, next))
  router.post('/communities/:communityId/rules', auth, (req, res, next) => void c.createRule(req, res, next))
  router.patch('/communities/:communityId/rules/:ruleId', auth, (req, res, next) => void c.updateRule(req, res, next))
  router.delete('/communities/:communityId/rules/:ruleId', auth, (req, res, next) => void c.deleteRule(req, res, next))

  router.get('/communities/:communityId/members', soft, (req, res, next) => void c.listMembers(req, res, next))
  router.patch('/communities/:communityId/members/:userId/role', auth, (req, res, next) => void c.updateMemberRole(req, res, next))
  router.post('/communities/:communityId/members/:userId/ban', auth, (req, res, next) => void c.banMember(req, res, next))

  router.post('/communities/:communityId/reports', auth, (req, res, next) => void c.createReport(req, res, next))
  router.get('/communities/:communityId/moderation/reports', auth, (req, res, next) => void c.listReports(req, res, next))
  router.post('/communities/:communityId/moderation/reports/:reportId/resolve', auth, (req, res, next) => void c.resolveReport(req, res, next))

  router.post('/communities/:communityId/join', auth, (req, res, next) => void c.join(req, res, next))
  router.delete('/communities/:communityId/join', auth, (req, res, next) => void c.leave(req, res, next))

  router.get('/threads/:threadId', soft, (req, res, next) => void c.getThread(req, res, next))
  router.post('/threads/:threadId/answers', auth, (req, res, next) => void c.addAnswer(req, res, next))
  router.post('/threads/:threadId/answers/:answerId/accept', auth, (req, res, next) => void c.acceptAnswer(req, res, next))
  router.post('/answers/:answerId/helpful', auth, (req, res, next) => void c.markHelpful(req, res, next))
  router.post('/threads/:threadId/like', auth, (req, res, next) => void c.likeThread(req, res, next))
  router.delete('/threads/:threadId/like', auth, (req, res, next) => void c.unlikeThread(req, res, next))
  router.post('/threads/:threadId/pin', auth, (req, res, next) => void c.pinThread(req, res, next))
  router.delete('/threads/:threadId', auth, (req, res, next) => void c.removeThread(req, res, next))
  router.post('/threads/:threadId/approve', auth, (req, res, next) => void c.approveThread(req, res, next))
  router.post('/threads/:threadId/answered', auth, (req, res, next) => void c.markThreadAnswered(req, res, next))

  return router
}
