import type { NextFunction, Request, Response } from 'express'
import { searchSuggestQuerySchema, unifiedSearchQuerySchema } from '@delve/contracts'
import { z } from 'zod'
import type { Env } from '../../config/env.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as searchService from './search.service.js'

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data })
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw parsed.error
  }
  return parsed.data
}

function optionalUserId(req: Request) {
  return (req as AuthedRequest).userId ?? null
}

export function createSearchController(env: Env) {
  return {
    async search(req: Request, res: Response, next: NextFunction) {
      try {
        const query = parseOrThrow(unifiedSearchQuerySchema, {
          q: req.query.q,
          types: req.query.types,
          limit: req.query.limit,
        })
        ok(res, await searchService.unifiedSearch(env, optionalUserId(req), query))
      } catch (err) {
        next(err)
      }
    },

    async suggest(req: Request, res: Response, next: NextFunction) {
      try {
        const query = parseOrThrow(searchSuggestQuerySchema, { q: req.query.q })
        ok(res, await searchService.searchSuggest(env, optionalUserId(req), query.q))
      } catch (err) {
        next(err)
      }
    },
  }
}
