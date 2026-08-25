import type { NextFunction, Response } from 'express'
import {
  adminFeatureDealBodySchema,
  adminModerateDealBodySchema,
  createDealBodySchema,
  createDealClaimBodySchema,
  createDealReportBodySchema,
  lookupDealClaimQuerySchema,
  dealPricePreviewBodySchema,
  publicDealsQuerySchema,
  recordDealAnalyticsBodySchema,
  resolveDealReportBodySchema,
  updateDealBodySchema,
  updateDealClaimBodySchema,
  businessDealClaimsQuerySchema,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as deal from './deal.service.js'
import * as dealOps from './deal-ops.service.js'

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
    async previewPrice(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const businessId = String(req.params.businessId || '')
        if (!businessId) throw new AppError(400, 'VALIDATION_ERROR', 'businessId required')
        const body = parseOrThrow(dealPricePreviewBodySchema, req.body)
        ok(res, await deal.previewDealPrice(requireUserId(req), businessId, body))
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
        const query = parseOrThrow(publicDealsQuerySchema, {
          limit: req.query.limit,
          businessId: req.query.businessId,
          q: req.query.q,
          category: req.query.category,
          city: req.query.city,
          sort: req.query.sort,
          featured: req.query.featured,
        })
        ok(res, await deal.listPublicActiveDeals(query.limit ?? 40, query.businessId ?? null, query))
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
    async claim(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createDealClaimBodySchema, req.body ?? {})
        ok(res, await dealOps.claimDeal(requireUserId(req), String(req.params.id), body), 201)
      } catch (err) {
        next(err)
      }
    },
    async myClaim(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await dealOps.getMyDealClaim(requireUserId(req), String(req.params.id)))
      } catch (err) {
        next(err)
      }
    },
    async listMyClaims(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await dealOps.listMyDealClaims(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async getMyClaim(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await dealOps.getMyDealClaimById(requireUserId(req), String(req.params.claimId)))
      } catch (err) {
        next(err)
      }
    },
    async listClaims(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const query = parseOrThrow(businessDealClaimsQuerySchema, { filter: req.query.filter })
        ok(res, await dealOps.listBusinessDealClaims(requireUserId(req), String(req.params.businessId), query.filter ?? 'all'))
      } catch (err) {
        next(err)
      }
    },
    async lookupClaim(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const query = parseOrThrow(lookupDealClaimQuerySchema, { code: req.query.code })
        ok(res, await dealOps.lookupBusinessDealClaim(requireUserId(req), String(req.params.businessId), query.code))
      } catch (err) {
        next(err)
      }
    },
    async redeemClaim(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await dealOps.redeemBusinessDealClaim(
            requireUserId(req),
            String(req.params.businessId),
            String(req.params.claimId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async updateClaim(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(updateDealClaimBodySchema, req.body)
        ok(res, await dealOps.updateDealClaimStatus(requireUserId(req), String(req.params.claimId), body.status))
      } catch (err) {
        next(err)
      }
    },
    async report(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createDealReportBodySchema, req.body)
        ok(res, await dealOps.reportDeal(requireUserId(req), String(req.params.id), body), 201)
      } catch (err) {
        next(err)
      }
    },
    async analytics(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(recordDealAnalyticsBodySchema, req.body)
        await dealOps.recordDealAnalytics(String(req.params.id), body.kind, req.userId)
        ok(res, { recorded: true })
      } catch (err) {
        next(err)
      }
    },
  }
}

export function createAdminDealController() {
  return {
    async list(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined
        ok(res, await dealOps.adminListDeals(status))
      } catch (err) {
        next(err)
      }
    },
    async moderate(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(adminModerateDealBodySchema, req.body)
        ok(
          res,
          await dealOps.adminModerateDeal(
            requireUserId(req),
            String(req.sessionId || ''),
            String(req.params.id),
            body.action,
            body.reason,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async feature(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(adminFeatureDealBodySchema, req.body)
        ok(
          res,
          await dealOps.adminFeatureDeal(
            requireUserId(req),
            String(req.sessionId || ''),
            String(req.params.id),
            body.featured,
            body.featuredRank,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async reports(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined
        ok(res, await dealOps.adminListDealReports(status))
      } catch (err) {
        next(err)
      }
    },
    async resolveReport(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(resolveDealReportBodySchema, req.body)
        ok(
          res,
          await dealOps.adminResolveDealReport(
            requireUserId(req),
            String(req.sessionId || ''),
            String(req.params.reportId),
            body,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async analytics(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const dealId = typeof req.query.dealId === 'string' ? req.query.dealId : undefined
        ok(res, await dealOps.adminDealAnalytics(dealId))
      } catch (err) {
        next(err)
      }
    },
  }
}
