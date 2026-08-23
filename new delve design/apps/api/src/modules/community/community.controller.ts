import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import {
  createCommunityAnswerBodySchema,
  createCommunityBodySchema,
  createCommunityReportBodySchema,
  createCommunityThreadBodySchema,
  updateCommunityBodySchema,
  updateMemberRoleBodySchema,
  upsertCommunityRuleBodySchema,
  type CommunityThreadKind,
  type CommunityType,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as communityService from './community.service.js'
import * as communityManage from './community-manage.service.js'
import * as threadService from './thread.service.js'

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data })
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid request')
  }
  return parsed.data
}

function requireUserId(req: AuthedRequest) {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  return req.userId
}

function optionalUserId(req: Request) {
  return (req as AuthedRequest).userId || null
}

const COMMUNITY_TYPES = new Set(['DESTINATION', 'INTEREST', 'TRANSPORT', 'OFFICIAL'])
const THREAD_KINDS = new Set([
  'POST', 'QUESTION', 'TIP', 'DISCUSSION', 'RECOMMENDATION', 'ANNOUNCEMENT', 'JOURNEY_SHARE', 'EVENT_SHARE',
])

export function createCommunityController() {
  return {
    async create(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createCommunityBodySchema, req.body)
        ok(res, await communityManage.createCommunity(requireUserId(req), body), 201)
      } catch (err) {
        next(err)
      }
    },

    async update(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(updateCommunityBodySchema, req.body)
        ok(res, await communityManage.updateCommunity(requireUserId(req), String(req.params.communityId), body))
      } catch (err) {
        next(err)
      }
    },

    async listRules(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await communityManage.listCommunityRules(String(req.params.communityId)))
      } catch (err) {
        next(err)
      }
    },

    async createRule(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(upsertCommunityRuleBodySchema, req.body)
        ok(
          res,
          await communityManage.createCommunityRule(requireUserId(req), String(req.params.communityId), body),
          201,
        )
      } catch (err) {
        next(err)
      }
    },

    async updateRule(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(upsertCommunityRuleBodySchema, req.body)
        ok(
          res,
          await communityManage.updateCommunityRule(
            requireUserId(req),
            String(req.params.communityId),
            String(req.params.ruleId),
            body,
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async deleteRule(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        await communityManage.deleteCommunityRule(
          requireUserId(req),
          String(req.params.communityId),
          String(req.params.ruleId),
        )
        ok(res, { ok: true })
      } catch (err) {
        next(err)
      }
    },

    async listMembers(req: Request, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await communityManage.listCommunityMembers(String(req.params.communityId), optionalUserId(req)),
        )
      } catch (err) {
        next(err)
      }
    },

    async updateMemberRole(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(updateMemberRoleBodySchema, req.body)
        await communityManage.updateMemberRole(
          requireUserId(req),
          String(req.params.communityId),
          String(req.params.userId),
          body.role,
        )
        ok(res, { ok: true })
      } catch (err) {
        next(err)
      }
    },

    async banMember(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined
        await communityManage.banMember(
          requireUserId(req),
          String(req.params.communityId),
          String(req.params.userId),
          reason,
        )
        ok(res, { ok: true })
      } catch (err) {
        next(err)
      }
    },

    async createReport(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createCommunityReportBodySchema, req.body)
        ok(
          res,
          await communityManage.createReport(requireUserId(req), String(req.params.communityId), body),
          201,
        )
      } catch (err) {
        next(err)
      }
    },

    async listReports(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await communityManage.listReports(requireUserId(req), String(req.params.communityId)))
      } catch (err) {
        next(err)
      }
    },

    async resolveReport(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        await communityManage.resolveReport(
          requireUserId(req),
          String(req.params.communityId),
          String(req.params.reportId),
        )
        ok(res, { ok: true })
      } catch (err) {
        next(err)
      }
    },

    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const q = String(req.query.q || '').trim() || undefined
        const destination = String(req.query.destination || '').trim() || undefined
        const typeRaw = String(req.query.type || '').trim().toUpperCase()
        const type = COMMUNITY_TYPES.has(typeRaw) ? (typeRaw as CommunityType) : undefined
        ok(res, await communityService.listCommunities(optionalUserId(req), { q, type, destination }))
      } catch (err) {
        next(err)
      }
    },

    async mine(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await communityService.listMyCommunities(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async listThreads(req: Request, res: Response, next: NextFunction) {
      try {
        const q = String(req.query.q || '').trim() || undefined
        const communityId = String(req.query.communityId || '').trim() || undefined
        const kindRaw = String(req.query.kind || '').trim().toUpperCase()
        const kind = THREAD_KINDS.has(kindRaw) ? (kindRaw as CommunityThreadKind) : undefined
        ok(res, await threadService.listThreads(optionalUserId(req), { q, kind, communityId }))
      } catch (err) {
        next(err)
      }
    },

    async listCommunityThreads(req: Request, res: Response, next: NextFunction) {
      try {
        const kindRaw = String(req.query.kind || '').trim().toUpperCase()
        const kind = THREAD_KINDS.has(kindRaw) ? (kindRaw as CommunityThreadKind) : undefined
        const kindsRaw = String(req.query.kinds || '')
          .split(',')
          .map(s => s.trim().toUpperCase())
          .filter(s => THREAD_KINDS.has(s)) as CommunityThreadKind[]
        ok(
          res,
          await threadService.listThreads(optionalUserId(req), {
            communityId: String(req.params.communityId),
            kind,
            kinds: kindsRaw.length ? kindsRaw : undefined,
            q: String(req.query.q || '').trim() || undefined,
          }),
        )
      } catch (err) {
        next(err)
      }
    },

    async createThread(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createCommunityThreadBodySchema, req.body)
        ok(
          res,
          await threadService.createThread(requireUserId(req), String(req.params.communityId), body),
          201,
        )
      } catch (err) {
        next(err)
      }
    },

    async getThread(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await threadService.getThread(String(req.params.threadId), optionalUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async addAnswer(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createCommunityAnswerBodySchema, req.body)
        ok(res, await threadService.addAnswer(requireUserId(req), String(req.params.threadId), body), 201)
      } catch (err) {
        next(err)
      }
    },

    async acceptAnswer(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await threadService.acceptAnswer(
            requireUserId(req),
            String(req.params.threadId),
            String(req.params.answerId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async markHelpful(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await threadService.markAnswerHelpful(requireUserId(req), String(req.params.answerId)))
      } catch (err) {
        next(err)
      }
    },

    async likeThread(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await threadService.likeThread(requireUserId(req), String(req.params.threadId)))
      } catch (err) {
        next(err)
      }
    },

    async unlikeThread(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await threadService.unlikeThread(requireUserId(req), String(req.params.threadId)))
      } catch (err) {
        next(err)
      }
    },

    async pinThread(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const pinned = req.body?.pinned !== false
        ok(res, await threadService.pinThread(requireUserId(req), String(req.params.threadId), pinned))
      } catch (err) {
        next(err)
      }
    },

    async removeThread(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await threadService.removeThread(requireUserId(req), String(req.params.threadId)))
      } catch (err) {
        next(err)
      }
    },

    async approveThread(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await threadService.approveThread(requireUserId(req), String(req.params.threadId)))
      } catch (err) {
        next(err)
      }
    },

    async markThreadAnswered(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await threadService.markThreadAnswered(requireUserId(req), String(req.params.threadId)))
      } catch (err) {
        next(err)
      }
    },

    async get(req: Request, res: Response, next: NextFunction) {
      try {
        const slugOrId = String(req.params.slugOrId || '')
        ok(res, await communityManage.getCommunityDetail(slugOrId, optionalUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async join(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await communityService.joinCommunity(requireUserId(req), String(req.params.communityId)))
      } catch (err) {
        next(err)
      }
    },

    async leave(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await communityService.leaveCommunity(requireUserId(req), String(req.params.communityId)))
      } catch (err) {
        next(err)
      }
    },

    async userCommunities(req: Request, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await communityService.listCommunitiesForUsername(
            String(req.params.username || ''),
            optionalUserId(req),
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async listJoinRequests(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await communityService.listJoinRequests(requireUserId(req), String(req.params.communityId)))
      } catch (err) {
        next(err)
      }
    },

    async approveJoinRequest(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await communityService.approveJoinRequest(
            requireUserId(req),
            String(req.params.communityId),
            String(req.params.userId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async denyJoinRequest(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await communityService.denyJoinRequest(
            requireUserId(req),
            String(req.params.communityId),
            String(req.params.userId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
  }
}
