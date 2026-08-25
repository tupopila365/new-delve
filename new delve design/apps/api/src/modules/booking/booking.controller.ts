import type { NextFunction, Response } from 'express'
import {
  cancelBookingBodySchema,
  createBookingBodySchema,
  providerBookingsQuerySchema,
  travelerBookingsQuerySchema,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as booking from './booking.service.js'

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

export function createBookingController() {
  return {
    async create(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createBookingBodySchema, req.body)
        ok(res, await booking.createBooking(requireUserId(req), body), 201)
      } catch (err) {
        next(err)
      }
    },
    async listMine(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const query = parseOrThrow(travelerBookingsQuerySchema, req.query)
        ok(res, await booking.listMyBookings(requireUserId(req), query.filter))
      } catch (err) {
        next(err)
      }
    },
    async getMine(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await booking.getMyBooking(requireUserId(req), String(req.params.bookingId || '')))
      } catch (err) {
        next(err)
      }
    },
    async cancelMine(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = Object.keys(req.body || {}).length ? parseOrThrow(cancelBookingBodySchema, req.body) : {}
        ok(res, await booking.cancelMyBooking(requireUserId(req), String(req.params.bookingId || ''), body))
      } catch (err) {
        next(err)
      }
    },
    async listForBusiness(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const businessId = String(req.params.businessId || '')
        const query = parseOrThrow(providerBookingsQuerySchema, req.query)
        ok(res, await booking.listBusinessBookings(requireUserId(req), businessId, query))
      } catch (err) {
        next(err)
      }
    },
    async getForBusiness(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await booking.getBusinessBooking(
            requireUserId(req),
            String(req.params.businessId || ''),
            String(req.params.bookingId || ''),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async confirm(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await booking.confirmBusinessBooking(
            requireUserId(req),
            String(req.params.businessId || ''),
            String(req.params.bookingId || ''),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async complete(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await booking.completeBusinessBooking(
            requireUserId(req),
            String(req.params.businessId || ''),
            String(req.params.bookingId || ''),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async cancelForBusiness(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = Object.keys(req.body || {}).length ? parseOrThrow(cancelBookingBodySchema, req.body) : {}
        ok(
          res,
          await booking.cancelBusinessBooking(
            requireUserId(req),
            String(req.params.businessId || ''),
            String(req.params.bookingId || ''),
            body,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async adminList(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await booking.adminListBookings(typeof req.query.status === 'string' ? req.query.status : undefined))
      } catch (err) {
        next(err)
      }
    },
    async adminGet(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await booking.adminGetBooking(String(req.params.bookingId || '')))
      } catch (err) {
        next(err)
      }
    },
  }
}
