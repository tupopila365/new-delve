import type { NextFunction, Response } from 'express'
import { createListingBodySchema, updateListingBodySchema } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as listing from './listing.service.js'

function parseOrThrow<T>(
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { flatten: () => unknown } } },
  value: unknown,
): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', parsed.error.flatten())
  }
  return parsed.data
}

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data, meta: { timestamp: new Date().toISOString() } })
}

function requireUserId(req: AuthedRequest) {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  return req.userId
}

export function createListingController(env: Env) {
  return {
    async create(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const businessId = String(req.params.businessId || '')
        if (!businessId) throw new AppError(400, 'VALIDATION_ERROR', 'businessId required')
        const body = parseOrThrow(createListingBodySchema, req.body)
        ok(res, await listing.createListing(env, requireUserId(req), businessId, body), 201)
      } catch (err) {
        next(err)
      }
    },
    async listForBusiness(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const businessId = String(req.params.businessId || '')
        if (!businessId) throw new AppError(400, 'VALIDATION_ERROR', 'businessId required')
        ok(res, await listing.listBusinessListings(env, requireUserId(req), businessId))
      } catch (err) {
        next(err)
      }
    },
    async listPublic(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 40
        const city = typeof req.query.city === 'string' ? req.query.city : null
        const category = typeof req.query.category === 'string' ? req.query.category : null
        const q = typeof req.query.q === 'string' ? req.query.q : null
        ok(
          res,
          await listing.listPublicListings(env, {
            limit: Number.isFinite(limitRaw) ? limitRaw : 40,
            city,
            category,
            q,
          }),
        )
      } catch (err) {
        next(err)
      }
    },
    async listPublicForBusiness(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const businessId = String(req.params.businessId || '')
        if (!businessId) throw new AppError(400, 'VALIDATION_ERROR', 'businessId required')
        const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 40
        ok(
          res,
          await listing.listPublicListingsByBusiness(
            env,
            businessId,
            Number.isFinite(limitRaw) ? limitRaw : 40,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async getOne(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const id = String(req.params.id || '')
        if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'Listing id required')
        ok(res, await listing.getListing(env, requireUserId(req), id))
      } catch (err) {
        next(err)
      }
    },
    async getPublic(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const id = String(req.params.id || '')
        if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'Listing id required')
        ok(res, await listing.getListingPublic(env, id))
      } catch (err) {
        next(err)
      }
    },
    async update(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const id = String(req.params.id || '')
        if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'Listing id required')
        const body = parseOrThrow(updateListingBodySchema, req.body)
        ok(res, await listing.updateListing(env, requireUserId(req), id, body))
      } catch (err) {
        next(err)
      }
    },
  }
}
