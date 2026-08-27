import type { NextFunction, Request, Response } from 'express'
import { adminModerationDecisionBodySchema, adminModerationTargetTypeSchema } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import type { AdminAuthedRequest } from '../../middleware/require-admin-session.js'
import * as moderation from './admin-moderation.service.js'

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data, meta: { timestamp: new Date().toISOString() } })
}

function requireTarget(req: Request) {
  const parsed = adminModerationTargetTypeSchema.safeParse(String(req.params.targetType || '').toUpperCase())
  if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid target type')
  const targetId = String(req.params.targetId || '').trim()
  if (!targetId) throw new AppError(400, 'VALIDATION_ERROR', 'targetId required')
  return { targetType: parsed.data, targetId }
}

export function createAdminModerationController() {
  return {
    async opsSummary(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await moderation.adminModerationOpsSummary(req.query))
      } catch (err) {
        next(err)
      }
    },
    async queue(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await moderation.adminListModerationQueue(req.query))
      } catch (err) {
        next(err)
      }
    },
    async getCase(req: AdminAuthedRequest, res: Response, next: NextFunction) {
      try {
        const { targetType, targetId } = requireTarget(req)
        ok(res, await moderation.adminGetModerationCase(targetType, targetId, req.userId))
      } catch (err) {
        next(err)
      }
    },
    async decide(req: AdminAuthedRequest, res: Response, next: NextFunction) {
      try {
        const { targetType, targetId } = requireTarget(req)
        const parsed = adminModerationDecisionBodySchema.safeParse(req.body)
        if (!parsed.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid moderation decision', parsed.error.flatten())
        }
        ok(res, await moderation.adminDecideModerationCase(req.userId!, req.sessionId!, targetType, targetId, parsed.data))
      } catch (err) {
        next(err)
      }
    },
    async posts(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await moderation.adminListModerationPosts(req.query))
      } catch (err) {
        next(err)
      }
    },
    async events(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await moderation.adminListModerationEvents(req.query))
      } catch (err) {
        next(err)
      }
    },
    async journeys(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await moderation.adminListModerationJourneys(req.query))
      } catch (err) {
        next(err)
      }
    },
    async comments(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await moderation.adminListModerationComments(req.query))
      } catch (err) {
        next(err)
      }
    },
    async communities(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await moderation.adminListModerationCommunities(req.query))
      } catch (err) {
        next(err)
      }
    },
  }
}
