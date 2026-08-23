import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import {
  addJourneyEventBodySchema,
  createJourneyBodySchema,
  createJourneyCommentBodySchema,
  journeyListQuerySchema,
  updateJourneyBodySchema,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as journeyService from './journey.service.js'

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

const coverBodySchema = z
  .object({
    coverUrl: z.string().trim().url(),
    coverResourceType: z.enum(['image', 'video']).optional().nullable(),
  })
  .strict()

export function createJourneyController() {
  return {
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const query = parseOrThrow(journeyListQuerySchema, {
          q: typeof req.query.q === 'string' ? req.query.q : undefined,
          filter: typeof req.query.filter === 'string' ? req.query.filter : undefined,
          destination: typeof req.query.destination === 'string' ? req.query.destination : undefined,
        })
        ok(res, await journeyService.listJourneys(optionalUserId(req), query))
      } catch (err) {
        next(err)
      }
    },

    async mine(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await journeyService.listMyJourneys(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async userJourneys(req: Request, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await journeyService.listUserJourneys(String(req.params.username), optionalUserId(req)),
        )
      } catch (err) {
        next(err)
      }
    },

    async get(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await journeyService.getJourney(String(req.params.slugOrId), optionalUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async create(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createJourneyBodySchema, req.body)
        ok(res, await journeyService.createJourney(requireUserId(req), body), 201)
      } catch (err) {
        next(err)
      }
    },

    async update(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(updateJourneyBodySchema, req.body)
        ok(res, await journeyService.updateJourney(requireUserId(req), String(req.params.journeyId), body))
      } catch (err) {
        next(err)
      }
    },

    async updateCover(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(coverBodySchema, req.body)
        ok(
          res,
          await journeyService.updateJourneyCover(
            requireUserId(req),
            String(req.params.journeyId),
            body.coverUrl,
            body.coverResourceType ?? undefined,
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async listComments(req: Request, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await journeyService.listJourneyComments(
            String(req.params.journeyId),
            optionalUserId(req),
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async addComment(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createJourneyCommentBodySchema, req.body)
        ok(
          res,
          await journeyService.addJourneyComment(
            requireUserId(req),
            String(req.params.journeyId),
            body.body,
          ),
          201,
        )
      } catch (err) {
        next(err)
      }
    },

    async deleteComment(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await journeyService.deleteJourneyComment(requireUserId(req), String(req.params.commentId)))
      } catch (err) {
        next(err)
      }
    },

    async like(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await journeyService.likeJourney(requireUserId(req), String(req.params.journeyId)))
      } catch (err) {
        next(err)
      }
    },

    async unlike(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await journeyService.unlikeJourney(requireUserId(req), String(req.params.journeyId)))
      } catch (err) {
        next(err)
      }
    },

    async addEvent(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(addJourneyEventBodySchema, req.body)
        ok(
          res,
          await journeyService.addEventToJourney(
            requireUserId(req),
            String(req.params.journeyId),
            body.eventId,
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async removeEvent(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await journeyService.removeEventFromJourney(
            requireUserId(req),
            String(req.params.journeyId),
            String(req.params.eventId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
  }
}
