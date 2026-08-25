import { z } from 'zod'
import { paymentStatusSchema } from './payment.js'
import { transferReversalDtoSchema } from './transfer-reversal.js'

export const refundStatusSchema = z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'])
export const refundReasonSchema = z.enum([
  'TRAVELER_CANCELLATION',
  'PROVIDER_CANCELLATION',
  'SERVICE_UNAVAILABLE',
  'DUPLICATE_PAYMENT',
  'ADMIN_ADJUSTMENT',
  'OTHER',
])
export const refundActorTypeSchema = z.enum(['TRAVELER', 'PROVIDER', 'ADMIN'])
export const cancellationRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'])

export const createCancellationRequestBodySchema = z
  .object({
    reason: refundReasonSchema.optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()

export const rejectCancellationBodySchema = z
  .object({
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()

export type RefundStatus = z.infer<typeof refundStatusSchema>
export type RefundReason = z.infer<typeof refundReasonSchema>
export type RefundActorType = z.infer<typeof refundActorTypeSchema>
export type CancellationRequestStatus = z.infer<typeof cancellationRequestStatusSchema>
export type CreateCancellationRequestBody = z.infer<typeof createCancellationRequestBodySchema>

export const cancellationRequestDtoSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  status: cancellationRequestStatusSchema,
  reason: refundReasonSchema,
  note: z.string().nullable(),
  requestedByType: refundActorTypeSchema,
  createdAt: z.string().datetime(),
  reviewedAt: z.string().datetime().nullable(),
})

export const refundDtoSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  bookingId: z.string(),
  businessId: z.string(),
  status: refundStatusSchema,
  amount: z.string(),
  currency: z.string(),
  reason: refundReasonSchema,
  explanation: z.string().nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  processingAt: z.string().datetime().nullable(),
  succeededAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
  booking: z
    .object({
      bookingReference: z.string(),
      status: z.string(),
      listingTitle: z.string(),
      startDateTime: z.string().datetime().nullable(),
    })
    .optional(),
  payment: z
    .object({
      status: paymentStatusSchema,
      amount: z.string(),
      paidAt: z.string().datetime().nullable(),
    })
    .optional(),
  business: z
    .object({
      name: z.string(),
      slug: z.string(),
    })
    .optional(),
  traveler: z
    .object({
      displayName: z.string(),
    })
    .optional(),
  payable: z
    .object({
      status: z.string(),
      stripeTransferIdPresent: z.boolean(),
      grossAmount: z.string().optional(),
      platformCommissionAmount: z.string().optional(),
      businessNetAmount: z.string().optional(),
      transferredAt: z.string().datetime().nullable().optional(),
    })
    .nullable()
    .optional(),
  reversal: transferReversalDtoSchema.nullable().optional(),
  requiresSettlementReversal: z.boolean().optional(),
  cancellationRequest: cancellationRequestDtoSchema.nullable().optional(),
})

export const bookingFinancialDtoSchema = z.object({
  cancellation: cancellationRequestDtoSchema.nullable(),
  refund: z
    .object({
      status: refundStatusSchema,
      amount: z.string(),
      currency: z.string(),
    })
    .nullable(),
  refundedAmount: z.string(),
  travelerMessage: z.string().nullable(),
})

export type CancellationRequestDto = z.infer<typeof cancellationRequestDtoSchema>
export type RefundDto = z.infer<typeof refundDtoSchema>
export type BookingFinancialDto = z.infer<typeof bookingFinancialDtoSchema>
