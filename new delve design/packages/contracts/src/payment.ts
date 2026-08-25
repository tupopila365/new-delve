import { z } from 'zod'

export const stripeConnectStatusSchema = z.enum([
  'NOT_CONNECTED',
  'ONBOARDING',
  'RESTRICTED',
  'ACTIVE',
  'DISABLED',
])

export const paymentProviderSchema = z.enum(['STRIPE'])

export const paymentStatusSchema = z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'])

export const businessPayableStatusSchema = z.enum([
  'PENDING',
  'ELIGIBLE',
  'PROCESSING',
  'TRANSFERRED',
  'REVERSED',
  'BLOCKED',
  'CANCELLED',
])

export type StripeConnectStatus = z.infer<typeof stripeConnectStatusSchema>
export type PaymentProvider = z.infer<typeof paymentProviderSchema>
export type PaymentStatus = z.infer<typeof paymentStatusSchema>
export type BusinessPayableStatus = z.infer<typeof businessPayableStatusSchema>

export const stripeConnectStatusDtoSchema = z.object({
  status: stripeConnectStatusSchema,
  chargesEnabled: z.boolean(),
  payoutsEnabled: z.boolean(),
  detailsSubmitted: z.boolean(),
  requirementsDueCount: z.number().int().min(0),
  settlementReady: z.boolean(),
  onboardingCompletedAt: z.string().datetime().nullable(),
})

export const stripeConnectOnboardDtoSchema = z.object({
  url: z.string().url(),
  status: stripeConnectStatusSchema,
})

export const paymentDtoSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  businessId: z.string(),
  provider: paymentProviderSchema,
  status: paymentStatusSchema,
  amount: z.string(),
  currency: z.string(),
  createdAt: z.string().datetime(),
  processingAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
})

export const createPaymentDtoSchema = z.object({
  payment: paymentDtoSchema,
  checkoutUrl: z.string().url().nullable(),
})

export const bookingPaymentSummarySchema = z.object({
  captured: z.boolean(),
  status: paymentStatusSchema.nullable(),
  note: z.string(),
})

export type StripeConnectStatusDto = z.infer<typeof stripeConnectStatusDtoSchema>
export type StripeConnectOnboardDto = z.infer<typeof stripeConnectOnboardDtoSchema>
export type PaymentDto = z.infer<typeof paymentDtoSchema>
export type CreatePaymentDto = z.infer<typeof createPaymentDtoSchema>
export type BookingPaymentSummary = z.infer<typeof bookingPaymentSummarySchema>

export const settlementEligibilitySchema = z.object({
  eligible: z.boolean(),
  code: z.string(),
  reason: z.string(),
  retryable: z.boolean(),
})

export const settlementAttemptDtoSchema = z.object({
  id: z.string(),
  outcome: z.string(),
  stripeTransferId: z.string().nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export const businessPayableDtoSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  paymentId: z.string(),
  businessId: z.string(),
  status: businessPayableStatusSchema,
  grossAmount: z.string(),
  platformCommissionAmount: z.string(),
  businessNetAmount: z.string(),
  currency: z.string(),
  stripeFeeAmount: z.string().nullable(),
  stripeTransferId: z.string().nullable(),
  eligibility: settlementEligibilitySchema,
  createdAt: z.string().datetime(),
  eligibleAt: z.string().datetime().nullable(),
  processingAt: z.string().datetime().nullable(),
  transferredAt: z.string().datetime().nullable(),
  booking: z.object({
    bookingReference: z.string(),
    status: z.string(),
    listingTitle: z.string(),
    completedAt: z.string().datetime().nullable(),
  }),
  payment: z.object({
    status: paymentStatusSchema,
    amount: z.string(),
    paidAt: z.string().datetime().nullable(),
  }),
  business: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    status: z.string(),
    stripeAccountStatus: stripeConnectStatusSchema,
    stripeAccountIdPresent: z.boolean(),
    chargesEnabled: z.boolean(),
    payoutsEnabled: z.boolean(),
    detailsSubmitted: z.boolean(),
  }),
  attempts: z.array(settlementAttemptDtoSchema).optional(),
  reversal: z
    .object({
      status: z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED']),
      amount: z.string(),
      currency: z.string(),
      succeededAt: z.string().datetime().nullable(),
      failedAt: z.string().datetime().nullable(),
      failureCode: z.string().nullable(),
      failureMessage: z.string().nullable(),
      stripeTransferReversalIdPresent: z.boolean(),
    })
    .nullable()
    .optional(),
})

export const providerEarningsSummarySchema = z.object({
  pending: z.string(),
  eligible: z.string(),
  transferred: z.string(),
  currency: z.string().nullable(),
})

export const providerEarningsDtoSchema = z.object({
  summary: providerEarningsSummarySchema,
  rows: z.array(
    z.object({
      id: z.string(),
      listingTitle: z.string(),
      bookingReference: z.string(),
      grossAmount: z.string(),
      platformCommissionAmount: z.string(),
      businessNetAmount: z.string(),
      currency: z.string(),
      status: businessPayableStatusSchema,
      providerLabel: z.string(),
      originallyTransferred: z.string().nullable().optional(),
      reversedAmount: z.string().nullable().optional(),
      reversalStatus: z.string().nullable().optional(),
      createdAt: z.string().datetime(),
    }),
  ),
})

export type SettlementEligibility = z.infer<typeof settlementEligibilitySchema>
export type SettlementAttemptDto = z.infer<typeof settlementAttemptDtoSchema>
export type BusinessPayableDto = z.infer<typeof businessPayableDtoSchema>
export type ProviderEarningsDto = z.infer<typeof providerEarningsDtoSchema>
