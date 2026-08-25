import type { NextFunction, Request, Response } from 'express'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import { createCancellationRequestBodySchema } from '@delve/contracts'
import * as connect from './connect.service.js'
import * as payments from './payment.service.js'
import * as settlement from './settlement.service.js'
import * as refunds from './refund.service.js'
import * as reversal from './transfer-reversal.service.js'
import { handleStripeWebhook } from './stripe-webhook.service.js'

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data, meta: { timestamp: new Date().toISOString() } })
}

function requireUserId(req: AuthedRequest) {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  return req.userId
}

export function createPaymentController(env: Env) {
  return {
    async onboard(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await connect.createConnectOnboardingLink(env, requireUserId(req), String(req.params.businessId || '')))
      } catch (err) {
        next(err)
      }
    },
    async connectStatus(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await connect.getConnectStatus(env, requireUserId(req), String(req.params.businessId || '')))
      } catch (err) {
        next(err)
      }
    },
    async createForBooking(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await payments.createBookingCheckout(env, requireUserId(req), String(req.params.bookingId || '')), 201)
      } catch (err) {
        next(err)
      }
    },
    async getMine(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await payments.getMyPayment(
            requireUserId(req),
            String(req.params.bookingId || ''),
            String(req.params.paymentId || ''),
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async earnings(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await settlement.listProviderEarnings(requireUserId(req), String(req.params.businessId || '')))
      } catch (err) {
        next(err)
      }
    },
    async adminList(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await settlement.adminListSettlements(typeof req.query.status === 'string' ? req.query.status : undefined))
      } catch (err) {
        next(err)
      }
    },
    async adminGet(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await settlement.adminGetSettlement(String(req.params.payableId || '')))
      } catch (err) {
        next(err)
      }
    },
    async adminRelease(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await settlement.releaseSettlement(env, requireUserId(req), String(req.params.payableId || '')))
      } catch (err) {
        next(err)
      }
    },
    async requestCancellation(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const parsed = createCancellationRequestBodySchema.safeParse(req.body || {})
        if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid cancellation request.')
        ok(
          res,
          await refunds.requestBookingCancellation(
            requireUserId(req),
            String(req.params.bookingId || ''),
            'TRAVELER',
            parsed.data,
          ),
          201,
        )
      } catch (err) {
        next(err)
      }
    },
    async requestProviderCancellation(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const parsed = createCancellationRequestBodySchema.safeParse(req.body || {})
        if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid cancellation request.')
        ok(
          res,
          await refunds.requestBookingCancellation(
            requireUserId(req),
            String(req.params.bookingId || ''),
            'PROVIDER',
            parsed.data,
            String(req.params.businessId || ''),
          ),
          201,
        )
      } catch (err) {
        next(err)
      }
    },
    async adminListRefunds(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await refunds.adminListRefunds(typeof req.query.status === 'string' ? req.query.status : undefined))
      } catch (err) {
        next(err)
      }
    },
    async adminListCancellations(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await refunds.adminListCancellationRequests(typeof req.query.status === 'string' ? req.query.status : undefined),
        )
      } catch (err) {
        next(err)
      }
    },
    async adminGetRefund(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await refunds.adminGetRefund(String(req.params.refundId || '')))
      } catch (err) {
        next(err)
      }
    },
    async adminApproveCancellation(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await refunds.approveCancellation(requireUserId(req), String(req.params.requestId || '')))
      } catch (err) {
        next(err)
      }
    },
    async adminRejectCancellation(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const note = typeof req.body?.note === 'string' ? req.body.note : null
        ok(res, await refunds.rejectCancellation(requireUserId(req), String(req.params.requestId || ''), note))
      } catch (err) {
        next(err)
      }
    },
    async adminIssueRefund(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await refunds.issueRefund(env, requireUserId(req), String(req.params.refundId || '')))
      } catch (err) {
        next(err)
      }
    },
    async adminReverseAndContinue(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await reversal.reverseSettlementAndContinueRefund(env, requireUserId(req), String(req.params.refundId || '')),
        )
      } catch (err) {
        next(err)
      }
    },
    async webhook(req: Request, res: Response, next: NextFunction) {
      try {
        const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : '')
        const signature = String(req.headers['stripe-signature'] || '')
        ok(res, await handleStripeWebhook(env, raw, signature))
      } catch (err) {
        next(err)
      }
    },
  }
}
