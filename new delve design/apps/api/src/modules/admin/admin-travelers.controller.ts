import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../../middleware/error-handler.js'
import type { AdminAuthedRequest } from '../../middleware/require-admin-session.js'
import * as travelers from './admin-travelers.service.js'
import { adminGetTravelerSafetyHistory } from './admin-moderation.service.js'
import * as booking from '../booking/booking.service.js'

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data, meta: { timestamp: new Date().toISOString() } })
}

function requireId(value: string | undefined, label: string) {
  const id = String(value || '').trim()
  if (!id) throw new AppError(400, 'VALIDATION_ERROR', `${label} required`)
  return id
}

export function createAdminTravelersController() {
  return {
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await travelers.adminListTravelers(req.query))
      } catch (err) {
        next(err)
      }
    },
    async opsSummary(req: Request, res: Response, next: NextFunction) {
      try {
        void req
        ok(res, await travelers.adminTravelerOpsSummary())
      } catch (err) {
        next(err)
      }
    },
    async get(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await travelers.adminGetTraveler(requireId(req.params.userId, 'userId')))
      } catch (err) {
        next(err)
      }
    },
    async bookings(req: Request, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await booking.adminListBookingsForUser(requireId(req.params.userId, 'userId'), {
            status: typeof req.query.status === 'string' ? req.query.status : undefined,
            page: req.query.page,
            pageSize: req.query.pageSize,
          }),
        )
      } catch (err) {
        next(err)
      }
    },
    async claims(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await travelers.adminListTravelerClaims(requireId(req.params.userId, 'userId'), req.query))
      } catch (err) {
        next(err)
      }
    },
    async journeys(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await travelers.adminListTravelerJourneys(requireId(req.params.userId, 'userId'), req.query))
      } catch (err) {
        next(err)
      }
    },
    async events(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await travelers.adminListTravelerEvents(requireId(req.params.userId, 'userId'), req.query))
      } catch (err) {
        next(err)
      }
    },
    async communities(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await travelers.adminListTravelerCommunities(requireId(req.params.userId, 'userId'), req.query))
      } catch (err) {
        next(err)
      }
    },
    async safety(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await adminGetTravelerSafetyHistory(requireId(req.params.userId, 'userId')))
      } catch (err) {
        next(err)
      }
    },
    async activity(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await travelers.adminGetTravelerActivity(requireId(req.params.userId, 'userId'), req.query))
      } catch (err) {
        next(err)
      }
    },
    async financial(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await travelers.adminGetTravelerFinancial(requireId(req.params.userId, 'userId'), req.query))
      } catch (err) {
        next(err)
      }
    },
    async restrict(req: AdminAuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await travelers.adminRestrictTraveler(
            String(req.userId || ''),
            String(req.sessionId || ''),
            requireId(req.params.userId, 'userId'),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async restore(req: AdminAuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await travelers.adminRestoreTraveler(
            String(req.userId || ''),
            String(req.sessionId || ''),
            requireId(req.params.userId, 'userId'),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
  }
}
