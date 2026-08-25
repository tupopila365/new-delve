import { z } from 'zod'
import { businessPayableStatusSchema, paymentStatusSchema } from './payment.js'
import { financialRecoveryCaseStatusSchema } from './reconciliation.js'

/**
 * Financial reporting contracts.
 *
 * Reports are derived from persisted Payment / BusinessPayable / Refund / TransferReversal /
 * PaymentDispute / FinancialRecoveryCase records. Historical commission is never recomputed
 * from the current DELVE_PLATFORM_FEE_BPS. Currencies are never summed together without FX.
 */

export const reportPeriodPresetSchema = z.enum([
  'TODAY',
  'LAST_7_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'LAST_MONTH',
  'CUSTOM',
])

export type ReportPeriodPreset = z.infer<typeof reportPeriodPresetSchema>

export const financialTimelineKindSchema = z.enum([
  'BOOKING_CREATED',
  'PAYMENT_PAID',
  'PAYABLE_CREATED',
  'SETTLEMENT_TRANSFERRED',
  'REFUND_SUCCEEDED',
  'TRANSFER_REVERSED',
  'DISPUTE_OPENED',
  'DISPUTE_WON',
  'DISPUTE_LOST',
  'RECOVERY_CASE_OPENED',
  'EVIDENCE_SUBMITTED',
])

export type FinancialTimelineKind = z.infer<typeof financialTimelineKindSchema>

export const financialTimelineEventSchema = z.object({
  kind: financialTimelineKindSchema,
  label: z.string(),
  at: z.string().datetime().nullable(),
  detail: z.string().nullable(),
})

export type FinancialTimelineEvent = z.infer<typeof financialTimelineEventSchema>

export const reportPeriodDtoSchema = z.object({
  preset: reportPeriodPresetSchema,
  from: z.string().datetime(),
  toExclusive: z.string().datetime(),
})

export type ReportPeriodDto = z.infer<typeof reportPeriodDtoSchema>

/**
 * Per-currency platform summary. Never mix these rows into one monetary total.
 *
 * Metric definitions (authoritative):
 * - grossPayments: sum Payment.amount where status=PAID and paidAt in period. FAILED/CANCELLED/PROCESSING excluded.
 * - successfulPaymentCount: count of those PAID payments.
 * - stripeProcessingFees: sum Payment.stripeFeeAmount where non-null among those payments. Null fees stay unknown.
 * - stripeFeesKnownCount / stripeFeesUnknownCount: how many of those payments have a populated vs null fee.
 * - platformCommission: sum BusinessPayable.platformCommissionAmount for payables whose Payment is PAID in period. Stored snapshot; not today's BPS.
 * - businessNetFromPaidPeriod: sum BusinessPayable.businessNetAmount for those same payables (obligation created with those payments).
 * - outstandingBusinessAmount: current BusinessPayable.businessNetAmount where status in PENDING, ELIGIBLE, PROCESSING. Excludes TRANSFERRED, CANCELLED, REVERSED, BLOCKED.
 * - settlementsTransferred: sum businessNetAmount where transferredAt in period, regardless of later REVERSED status. Historical transfer remains visible.
 * - settlementsPending / settlementsEligible: current snapshot of PENDING / ELIGIBLE nets (operational, as of now).
 * - refundsSucceeded: sum Refund.amount where status=SUCCEEDED and succeededAt in period. PENDING/PROCESSING do not count as money returned.
 * - refundsProcessingAmount: informational; not completed cash return.
 * - transferReversalsSucceeded: sum TransferReversal.amount where status=SUCCEEDED and succeededAt in period. Not netted against settlementsTransferred.
 * - disputeAmountOpened / Won / Lost: dispute.amount by createdAt / wonAt / lostAt in period.
 * - disputeFees: sum PaymentDispute.stripeFeeAmount where non-null for disputes with lostAt or createdAt in period.
 * - unresolvedRecoveryExposure: sum FinancialRecoveryCase.amount where status OPEN or UNDER_REVIEW (current snapshot). Wording: unresolved financial exposure, not profit or debt.
 * - unresolvedDisputeExposure: sum PaymentDispute.amount where recoveryStatus in RECOVERY_REQUIRED, RECOVERY_PENDING, MANUAL_REVIEW (current snapshot).
 * - marketplaceContributionBeforeOperatingExpenses: platformCommission minus known Stripe payment fees minus known dispute fees. Not profit.
 */
export const currencyFinancialSummarySchema = z.object({
  currency: z.string(),
  grossPayments: z.string(),
  successfulPaymentCount: z.number().int(),
  stripeProcessingFees: z.string().nullable(),
  stripeFeesKnownCount: z.number().int(),
  stripeFeesUnknownCount: z.number().int(),
  platformCommission: z.string(),
  businessNetFromPaidPeriod: z.string(),
  outstandingBusinessAmount: z.string(),
  settlementsTransferred: z.string(),
  settlementsPending: z.string(),
  settlementsEligible: z.string(),
  settlementsProcessing: z.string(),
  settlementsBlocked: z.string(),
  settlementsReversed: z.string(),
  refundsSucceeded: z.string(),
  refundsSucceededCount: z.number().int(),
  refundsProcessingAmount: z.string(),
  refundsFailedCount: z.number().int(),
  transferReversalsSucceeded: z.string(),
  transferReversalsSucceededCount: z.number().int(),
  transferReversalsFailedCount: z.number().int(),
  transferReversalsOutstandingAmount: z.string(),
  disputeAmountOpened: z.string(),
  disputeAmountWon: z.string(),
  disputeAmountLost: z.string(),
  disputeFees: z.string().nullable(),
  disputeFeesKnownCount: z.number().int(),
  disputeFeesUnknownCount: z.number().int(),
  unresolvedDisputeExposure: z.string(),
  unresolvedRecoveryExposure: z.string(),
  unresolvedRecoveryCaseCount: z.number().int(),
  marketplaceContributionBeforeOperatingExpenses: z.string().nullable(),
  marketplaceContributionComplete: z.boolean(),
  paymentsNeedingFinancialReviewCount: z.number().int(),
})

export type CurrencyFinancialSummary = z.infer<typeof currencyFinancialSummarySchema>

export const payableStatusBucketSchema = z.object({
  status: businessPayableStatusSchema,
  currency: z.string(),
  count: z.number().int(),
  grossAmount: z.string(),
  platformCommission: z.string(),
  businessNet: z.string(),
})

export type PayableStatusBucket = z.infer<typeof payableStatusBucketSchema>

export const platformFinancialReportDtoSchema = z.object({
  period: reportPeriodDtoSchema,
  /** Operational Stripe platform cash, not Delve ledger truth. */
  stripePlatformBalance: z
    .array(
      z.object({
        currency: z.string(),
        available: z.string(),
        pending: z.string(),
      }),
    )
    .nullable(),
  unmatchedOpenCount: z.number().int(),
  openCriticalReconciliationIssueCount: z.number().int(),
  byCurrency: z.array(currencyFinancialSummarySchema),
  payableBuckets: z.array(payableStatusBucketSchema),
  recoveryByType: z.array(
    z.object({
      type: z.string(),
      status: financialRecoveryCaseStatusSchema,
      currency: z.string(),
      count: z.number().int(),
      amount: z.string(),
    }),
  ),
  disputesByStatus: z.array(
    z.object({
      status: z.string(),
      count: z.number().int(),
    }),
  ),
  disputesByReason: z.array(
    z.object({
      reason: z.string(),
      count: z.number().int(),
    }),
  ),
})

export type PlatformFinancialReportDto = z.infer<typeof platformFinancialReportDtoSchema>

export const financialTrendPointSchema = z.object({
  date: z.string(),
  currency: z.string(),
  grossPayments: z.string(),
  platformCommission: z.string(),
  refundsSucceeded: z.string(),
  settlementsTransferred: z.string(),
})

export type FinancialTrendPoint = z.infer<typeof financialTrendPointSchema>

export const financialTrendDtoSchema = z.object({
  period: reportPeriodDtoSchema,
  points: z.array(financialTrendPointSchema),
})

export type FinancialTrendDto = z.infer<typeof financialTrendDtoSchema>

export const businessPerformanceRowSchema = z.object({
  businessId: z.string(),
  businessName: z.string(),
  currency: z.string(),
  bookingCount: z.number().int(),
  grossBookingValue: z.string(),
  platformCommission: z.string(),
  businessNet: z.string(),
  transferred: z.string(),
  pending: z.string(),
  refundAmount: z.string(),
  disputeAmount: z.string(),
  unresolvedRecoveryExposure: z.string(),
})

export type BusinessPerformanceRow = z.infer<typeof businessPerformanceRowSchema>

export const bookingFinancialRowSchema = z.object({
  bookingId: z.string(),
  bookingReference: z.string(),
  businessId: z.string(),
  businessName: z.string(),
  travelerUsername: z.string().nullable(),
  paymentStatus: paymentStatusSchema.nullable(),
  grossAmount: z.string().nullable(),
  currency: z.string(),
  stripeFeeAmount: z.string().nullable(),
  stripeFeeUnknown: z.boolean(),
  platformCommissionAmount: z.string().nullable(),
  businessNetAmount: z.string().nullable(),
  settlementStatus: businessPayableStatusSchema.nullable(),
  refundAmount: z.string(),
  refundState: z.string(),
  disputeStatus: z.string().nullable(),
  disputeAmount: z.string().nullable(),
  recoveryExposure: z.string(),
  needsFinancialReview: z.boolean(),
  createdAt: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
})

export type BookingFinancialRow = z.infer<typeof bookingFinancialRowSchema>

export const paginatedBookingFinancialReportDtoSchema = z.object({
  period: reportPeriodDtoSchema,
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  rows: z.array(bookingFinancialRowSchema),
})

export type PaginatedBookingFinancialReportDto = z.infer<typeof paginatedBookingFinancialReportDtoSchema>

export const bookingFinancialSummaryDtoSchema = z.object({
  bookingId: z.string(),
  bookingReference: z.string(),
  businessName: z.string(),
  travelerUsername: z.string().nullable(),
  travelerPaid: z.string().nullable(),
  currency: z.string(),
  paymentStatus: paymentStatusSchema.nullable(),
  stripeFeeAmount: z.string().nullable(),
  stripeFeeUnknown: z.boolean(),
  delveCommission: z.string().nullable(),
  businessNet: z.string().nullable(),
  settlementStatus: businessPayableStatusSchema.nullable(),
  refundedAmount: z.string(),
  reversalAmount: z.string(),
  disputeAmount: z.string().nullable(),
  disputeStatus: z.string().nullable(),
  recoveryExposure: z.string(),
  needsFinancialReview: z.boolean(),
  /** Admin-only operational Stripe connected-account balances. Not a provider wallet. */
  connectedAccountBalance: z
    .array(
      z.object({
        currency: z.string(),
        available: z.string(),
        pending: z.string(),
      }),
    )
    .nullable(),
  timeline: z.array(financialTimelineEventSchema),
})

export type BookingFinancialSummaryDto = z.infer<typeof bookingFinancialSummaryDtoSchema>

export const providerFinancialReportDtoSchema = z.object({
  period: reportPeriodDtoSchema,
  byCurrency: z.array(
    z.object({
      currency: z.string(),
      grossBookingValue: z.string(),
      successfulPaymentCount: z.number().int(),
      platformCommission: z.string(),
      businessNet: z.string(),
      pending: z.string(),
      eligible: z.string(),
      processing: z.string(),
      transferred: z.string(),
      reversed: z.string(),
      refunded: z.string(),
      disputed: z.string(),
    }),
  ),
})

export type ProviderFinancialReportDto = z.infer<typeof providerFinancialReportDtoSchema>

export const dailyPlatformReportDtoSchema = z.object({
  date: z.string(),
  period: reportPeriodDtoSchema,
  byCurrency: z.array(currencyFinancialSummarySchema),
})

export type DailyPlatformReportDto = z.infer<typeof dailyPlatformReportDtoSchema>

export const monthlyPlatformReportDtoSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  period: reportPeriodDtoSchema,
  byCurrency: z.array(currencyFinancialSummarySchema),
})

export type MonthlyPlatformReportDto = z.infer<typeof monthlyPlatformReportDtoSchema>

export const financialExportKindSchema = z.enum([
  'payments',
  'settlements',
  'refunds',
  'disputes',
  'businesses',
  'bookings',
])

export type FinancialExportKind = z.infer<typeof financialExportKindSchema>
