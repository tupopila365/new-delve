import type { NextFunction, Response } from 'express'
import { createDealBodySchema, updateDealBodySchema } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as deal from './deal.service.js'

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

export function createDealController() {
  return {
    async create(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const businessId = String(req.params.businessId || '')
        if (!businessId) throw new AppError(400, 'VALIDATION_ERROR', 'businessId required')
        const body = parseOrThrow(createDealBodySchema, req.body)
        ok(res, await deal.createDeal(requireUserId(req), businessId, body), 201)
      } catch (err) {
        next(err)
      }
    },
    async listForBusiness(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const businessId = String(req.params.businessId || '')
        if (!businessId) throw new AppError(400, 'VALIDATION_ERROR', 'businessId required')
        ok(res, await deal.listBusinessDeals(requireUserId(req), businessId))
      } catch (err) {
        next(err)
      }
    },
    async getOne(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const id = String(req.params.id || '')
        if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'Deal id required')
        ok(res, await deal.getDeal(requireUserId(req), id))
      } catch (err) {
        next(err)
      }
    },
    async update(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const id = String(req.params.id || '')
        if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'Deal id required')
        const body = parseOrThrow(updateDealBodySchema, req.body)
        ok(res, await deal.updateDeal(requireUserId(req), id, body))
      } catch (err) {
        next(err)
      }
    },
    async listPublic(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 40
        const businessId =
          typeof req.query.businessId === 'string' && req.query.businessId.trim()
            ? req.query.businessId.trim()
            : null
        ok(
          res,
          await deal.listPublicActiveDeals(Number.isFinite(limitRaw) ? limitRaw : 40, businessId),
        )
      } catch (err) {
        next(err)
      }
    },
    async getPublic(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const id = String(req.params.id || '')
        if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'Deal id required')
        ok(res, await deal.getPublicDeal(id))
      } catch (err) {
        next(err)
      }
    },
  }
}
