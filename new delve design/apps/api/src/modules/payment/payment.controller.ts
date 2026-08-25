import type { NextFunction, Request, Response } from 'express'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import { createCancellationRequestBodySchema, providerDisputeEvidenceBodySchema, startReconciliationBodySchema, resolveReconciliationIssueBodySchema, resolveRecoveryCaseBodySchema, submitDisputeEvidenceBodySchema } from '@delve/contracts'
import * as connect from './connect.service.js'
import * as payments from './payment.service.js'
import * as settlement from './settlement.service.js'
import * as refunds from './refund.service.js'
import * as reversal from './transfer-reversal.service.js'
import * as disputes from './dispute.service.js'
import * as recon from './reconciliation.service.js'
import * as recovery from './recovery-case.service.js'
import * as reports from './financial-report.service.js'
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
    async adminListDisputes(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await disputes.adminListDisputes(typeof req.query.status === 'string' ? req.query.status : undefined))
      } catch (err) {
        next(err)
      }
    },
    async adminGetDispute(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await disputes.adminGetDispute(String(req.params.id || '')))
      } catch (err) {
        next(err)
      }
    },
    async adminSubmitDisputeEvidence(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const parsed = submitDisputeEvidenceBodySchema.safeParse(req.body || {})
        if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid dispute evidence.')
        ok(res, await disputes.adminSubmitEvidence(env, requireUserId(req), String(req.params.id || ''), parsed.data))
      } catch (err) {
        next(err)
      }
    },
    async adminRecoverDispute(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await disputes.adminRecoverLostDispute(env, requireUserId(req), String(req.params.id || '')))
      } catch (err) {
        next(err)
      }
    },
    async listBusinessDisputes(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await disputes.listBusinessDisputes(requireUserId(req), String(req.params.businessId || '')))
      } catch (err) {
        next(err)
      }
    },
    async submitProviderDisputeNote(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const parsed = providerDisputeEvidenceBodySchema.safeParse(req.body || {})
        if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid dispute note.')
        ok(
          res,
          await disputes.submitProviderDisputeNote(
            requireUserId(req),
            String(req.params.businessId || ''),
            String(req.params.id || ''),
            parsed.data.note,
          ),
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
    async reconSummary(_req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await recon.adminReconciliationSummary())
      } catch (err) {
        next(err)
      }
    },
    async reconListIssues(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await recon.adminListReconciliationIssues({
            severity: typeof req.query.severity === 'string' ? req.query.severity : undefined,
            type: typeof req.query.type === 'string' ? req.query.type : undefined,
            status: typeof req.query.status === 'string' ? req.query.status : undefined,
            businessId: typeof req.query.businessId === 'string' ? req.query.businessId : undefined,
          }),
        )
      } catch (err) {
        next(err)
      }
    },
    async reconGetIssue(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await recon.adminGetReconciliationIssue(String(req.params.id || '')))
      } catch (err) {
        next(err)
      }
    },
    async reconResolveIssue(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const parsed = resolveReconciliationIssueBodySchema.safeParse(req.body || {})
        if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid resolution.')
        ok(
          res,
          await recon.adminResolveReconciliationIssue(
            requireUserId(req),
            String(req.params.id || ''),
            parsed.data.resolutionType,
            parsed.data.note,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async reconRun(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const parsed = startReconciliationBodySchema.safeParse(req.body || {})
        if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid reconciliation request.')
        ok(
          res,
          await recon.runFinancialReconciliation(env, {
            ...parsed.data,
            triggeredByType: 'ADMIN',
            triggeredByUserId: requireUserId(req),
          }),
        )
      } catch (err) {
        next(err)
      }
    },
    async reconBooking(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await recon.reconcileBookingFinancialChain(env, String(req.params.bookingId || ''), requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async reconUnmatched(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await recon.adminListUnmatchedEvents(typeof req.query.status === 'string' ? req.query.status : undefined))
      } catch (err) {
        next(err)
      }
    },
    async reconRetryUnmatched(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await recon.retryUnmatchedEvent(env, String(req.params.id || ''), requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async reconMarkUnmatched(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await recon.markUnmatchedReviewed(String(req.params.id || ''), requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
    async reconListRecovery(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await recovery.adminListRecoveryCases(typeof req.query.status === 'string' ? req.query.status : undefined))
      } catch (err) {
        next(err)
      }
    },
    async reconGetRecovery(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await recovery.adminGetRecoveryCase(String(req.params.id || '')))
      } catch (err) {
        next(err)
      }
    },
    async reconResolveRecovery(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const parsed = resolveRecoveryCaseBodySchema.safeParse(req.body || {})
        if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid recovery update.')
        ok(
          res,
          await recovery.adminResolveRecoveryCase(
            requireUserId(req),
            String(req.params.id || ''),
            parsed.data.status,
            parsed.data.note,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async reconJob(req: Request, res: Response, next: NextFunction) {
      try {
        const secret = env.RECONCILIATION_JOB_SECRET?.trim()
        if (!secret) throw new AppError(503, 'JOB_SECRET_MISSING', 'Reconciliation job secret is not configured.')
        const header = String(req.headers.authorization || '')
        if (header !== `Bearer ${secret}`) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
        ok(res, await recon.runFinancialReconciliation(env, { scope: 'STALE', triggeredByType: 'SCHEDULE' }))
      } catch (err) {
        next(err)
      }
    },
    async adminReportSummary(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await reports.adminPlatformFinancialReport(env, req.query as Record<string, string>))
      } catch (err) {
        next(err)
      }
    },
    async adminReportTrend(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await reports.adminFinancialTrend(req.query as Record<string, string>))
      } catch (err) {
        next(err)
      }
    },
    async adminReportBusinesses(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await reports.adminBusinessPerformance(req.query as Record<string, string>))
      } catch (err) {
        next(err)
      }
    },
    async adminReportBookings(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await reports.adminBookingFinancialTable(req.query as Record<string, string>))
      } catch (err) {
        next(err)
      }
    },
    async adminReportBookingFinancial(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await reports.getBookingFinancialSummary(String(req.params.bookingId || ''), { audience: 'admin', env }),
        )
      } catch (err) {
        next(err)
      }
    },
    async adminReportDaily(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await reports.adminDailyReport(env, req.query as Record<string, string>))
      } catch (err) {
        next(err)
      }
    },
    async adminReportMonthly(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await reports.adminMonthlyReport(env, req.query as Record<string, string>))
      } catch (err) {
        next(err)
      }
    },
    async adminReportExport(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const kind = String(req.params.kind || '').replace(/\.csv$/i, '') as
          | 'payments'
          | 'settlements'
          | 'refunds'
          | 'disputes'
          | 'businesses'
          | 'bookings'
        const allowed = ['payments', 'settlements', 'refunds', 'disputes', 'businesses', 'bookings']
        if (!allowed.includes(kind)) throw new AppError(400, 'VALIDATION_ERROR', 'Unknown export kind.')
        const file = await reports.adminExportCsv(kind, req.query as Record<string, string>)
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
        res.status(200).send(file.body)
      } catch (err) {
        next(err)
      }
    },
    async providerReport(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await reports.providerFinancialReport(
            requireUserId(req),
            String(req.params.businessId || ''),
            req.query as Record<string, string>,
          ),
        )
      } catch (err) {
        next(err)
      }
    },
    async providerReportExport(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const file = await reports.providerExportCsv(
          requireUserId(req),
          String(req.params.businessId || ''),
          req.query as Record<string, string>,
        )
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
        res.status(200).send(file.body)
      } catch (err) {
        next(err)
      }
    },
  }
}
