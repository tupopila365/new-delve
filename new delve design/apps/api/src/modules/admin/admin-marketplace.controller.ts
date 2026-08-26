import type { NextFunction, Request, Response } from 'express'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import type { AdminAuthedRequest } from '../../middleware/require-admin-session.js'
import * as marketplace from './admin-marketplace.service.js'
import * as dealOps from '../deal/deal-ops.service.js'
import * as booking from '../booking/booking.service.js'

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data, meta: { timestamp: new Date().toISOString() } })
}

function requireId(value: string | undefined, label: string) {
  const id = String(value || '').trim()
  if (!id) throw new AppError(400, 'VALIDATION_ERROR', `${label} required`)
  return id
}

export function createAdminMarketplaceController(env: Env) {
  return {
    async listBusinesses(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await marketplace.adminListBusinesses(req.query))
      } catch (err) {
        next(err)
      }
    },
    async opsSummary(req: Request, res: Response, next: NextFunction) {
      try {
        void req
        ok(res, await marketplace.adminMarketplaceOpsSummary())
      } catch (err) {
        next(err)
      }
    },
    async getBusiness(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await marketplace.adminGetBusiness(requireId(req.params.businessId, 'businessId')))
      } catch (err) {
        next(err)
      }
    },
    async listMembers(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await marketplace.adminListBusinessMembers(requireId(req.params.businessId, 'businessId')))
      } catch (err) {
        next(err)
      }
    },
    async verify(req: AdminAuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await marketplace.adminVerifyBusiness(
            String(req.userId || ''),
            String(req.sessionId || ''),
            requireId(req.params.businessId, 'businessId'),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async rejectVerification(req: AdminAuthedRequest, res: Response, next: NextFunction) {
      try {
        const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined
        ok(
          res,
          await marketplace.adminRejectBusinessVerification(
            String(req.userId || ''),
            String(req.sessionId || ''),
            requireId(req.params.businessId, 'businessId'),
            reason,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async refreshConnect(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await marketplace.adminRefreshBusinessConnect(env, requireId(req.params.businessId, 'businessId')))
      } catch (err) {
        next(err)
      }
    },
    async finance(req: Request, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await marketplace.adminGetBusinessFinance(requireId(req.params.businessId, 'businessId'), {
            preset: typeof req.query.preset === 'string' ? req.query.preset : undefined,
            from: typeof req.query.from === 'string' ? req.query.from : undefined,
            to: typeof req.query.to === 'string' ? req.query.to : undefined,
            currency: typeof req.query.currency === 'string' ? req.query.currency : undefined,
          }),
        )
      } catch (err) {
        next(err)
      }
    },
    async activity(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await marketplace.adminGetBusinessActivity(requireId(req.params.businessId, 'businessId')))
      } catch (err) {
        next(err)
      }
    },
    async listBusinessDeals(req: Request, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await dealOps.adminListDealsForBusiness(requireId(req.params.businessId, 'businessId'), {
            status: typeof req.query.status === 'string' ? req.query.status : undefined,
            page: req.query.page,
            pageSize: req.query.pageSize,
          }),
        )
      } catch (err) {
        next(err)
      }
    },
    async listBusinessBookings(req: Request, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await booking.adminListBookingsForBusiness(requireId(req.params.businessId, 'businessId'), {
            status: typeof req.query.status === 'string' ? req.query.status : undefined,
            page: req.query.page,
            pageSize: req.query.pageSize,
          }),
        )
      } catch (err) {
        next(err)
      }
    },
    async listListings(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await marketplace.adminListListings(env, req.query))
      } catch (err) {
        next(err)
      }
    },
    async getListing(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await marketplace.adminGetListing(env, requireId(req.params.listingId, 'listingId')))
      } catch (err) {
        next(err)
      }
    },
  }
}
