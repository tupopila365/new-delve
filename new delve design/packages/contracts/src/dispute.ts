import { z } from 'zod'

export const paymentDisputeStatusSchema = z.enum([
  'NEEDS_RESPONSE',
  'UNDER_REVIEW',
  'WARNING',
  'WON',
  'LOST',
  'CLOSED',
])

export const paymentDisputeRecoveryStatusSchema = z.enum([
  'NOT_REQUIRED',
  'BLOCKED_SETTLEMENT',
  'RECOVERY_PENDING',
  'RECOVERY_REQUIRED',
  'RECOVERED',
  'RECOVERY_FAILED',
  'MANUAL_REVIEW',
])

export const disputeExposureCodeSchema = z.enum([
  'NO_SETTLEMENT',
  'SETTLEMENT_BLOCKED',
  'SETTLEMENT_IN_FLIGHT',
  'SETTLEMENT_TRANSFERRED',
  'SETTLEMENT_REVERSED',
  'REFUNDED_ALREADY',
  'MANUAL_REVIEW',
])

export type PaymentDisputeStatus = z.infer<typeof paymentDisputeStatusSchema>
export type PaymentDisputeRecoveryStatus = z.infer<typeof paymentDisputeRecoveryStatusSchema>
export type DisputeExposureCode = z.infer<typeof disputeExposureCodeSchema>

export const paymentDisputeListItemSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  bookingId: z.string(),
  businessId: z.string(),
  bookingReference: z.string(),
  travelerUsername: z.string().nullable(),
  businessName: z.string(),
  amount: z.string(),
  currency: z.string(),
  reason: z.string(),
  status: paymentDisputeStatusSchema,
  stripeStatus: z.string(),
  evidenceDueAt: z.string().datetime().nullable(),
  paymentPaidAt: z.string().datetime().nullable(),
  exposureCode: z.string().nullable(),
  recoveryStatus: paymentDisputeRecoveryStatusSchema,
  settlementLabel: z.string(),
  createdAt: z.string().datetime(),
})

export const paymentDisputeDtoSchema = paymentDisputeListItemSchema.extend({
  listingTitle: z.string(),
  bookingStatus: z.string(),
  paymentStatus: z.string(),
  paymentAmount: z.string(),
  payableStatus: z.string().nullable(),
  payableNetAmount: z.string().nullable(),
  stripeTransferIdPresent: z.boolean(),
  refundStatuses: z.array(z.string()),
  reversalStatus: z.string().nullable(),
  providerEvidenceNote: z.string().nullable(),
  providerEvidenceAt: z.string().datetime().nullable(),
  submittedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  wonAt: z.string().datetime().nullable(),
  lostAt: z.string().datetime().nullable(),
  evidenceAccepting: z.boolean(),
  balanceWarning: z.string().nullable().optional(),
  derivedEvidence: z.object({
    bookingReference: z.string(),
    listingTitle: z.string(),
    businessName: z.string(),
    bookingStatus: z.string(),
    paymentAmount: z.string(),
    currency: z.string(),
    bookingCreatedAt: z.string().datetime(),
    confirmedAt: z.string().datetime().nullable(),
    completedAt: z.string().datetime().nullable(),
    dealTitle: z.string().nullable(),
  }),
  timeline: z.array(
    z.object({
      kind: z.string(),
      label: z.string(),
      at: z.string().datetime().nullable(),
      detail: z.string().nullable(),
    }),
  ),
})

export const submitDisputeEvidenceBodySchema = z
  .object({
    productDescription: z.string().trim().max(2000).optional(),
    serviceDate: z.string().trim().max(40).optional(),
    uncategorizedText: z.string().trim().max(4000).optional(),
    cancellationPolicy: z.string().trim().max(2000).optional(),
    refundPolicy: z.string().trim().max(2000).optional(),
    customerCommunication: z.string().trim().max(4000).optional(),
    includeDerivedFacts: z.boolean().optional(),
  })
  .strict()

export const providerDisputeEvidenceBodySchema = z
  .object({
    note: z.string().trim().min(1).max(4000),
  })
  .strict()

export const providerDisputeSummarySchema = z.object({
  id: z.string(),
  bookingReference: z.string(),
  listingTitle: z.string(),
  amount: z.string(),
  currency: z.string(),
  status: paymentDisputeStatusSchema,
  recoveryStatus: paymentDisputeRecoveryStatusSchema,
  settlementLabel: z.string(),
  evidenceDueAt: z.string().datetime().nullable(),
  providerEvidenceNote: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export type PaymentDisputeListItem = z.infer<typeof paymentDisputeListItemSchema>
export type PaymentDisputeDto = z.infer<typeof paymentDisputeDtoSchema>
export type SubmitDisputeEvidenceBody = z.infer<typeof submitDisputeEvidenceBodySchema>
export type ProviderDisputeEvidenceBody = z.infer<typeof providerDisputeEvidenceBodySchema>
export type ProviderDisputeSummary = z.infer<typeof providerDisputeSummarySchema>
