import type { NextFunction, Response } from 'express'
import { createBusinessBodySchema, updateBusinessBodySchema } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as business from './business.service.js'

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

export function createBusinessController() {
  return {
    async create(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createBusinessBodySchema, req.body)
        ok(res, await business.createBusiness(requireUserId(req), body), 201)
      } catch (err) {
        next(err)
      }
    },
    async listMine(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await business.listMyBusinesses(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async dashboard(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await business.getMyDashboard(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async getOne(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const id = String(req.params.id || '')
        if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'Business id required')
        ok(res, await business.getBusinessForMember(requireUserId(req), id))
      } catch (err) {
        next(err)
      }
    },
    async getPublic(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const slug = String(req.params.slug || '')
        if (!slug) throw new AppError(400, 'VALIDATION_ERROR', 'Business slug required')
        ok(res, await business.getPublicBusinessBySlug(slug))
      } catch (err) {
        next(err)
      }
    },
    async update(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const id = String(req.params.id || '')
        if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'Business id required')
        const body = parseOrThrow(updateBusinessBodySchema, req.body)
        ok(res, await business.updateBusiness(requireUserId(req), id, body))
      } catch (err) {
        next(err)
      }
    },
  }
}
