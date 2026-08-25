import { z } from 'zod'

export const transferReversalStatusSchema = z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'])
export const transferReversalReasonSchema = z.enum(['BOOKING_REFUND'])

export type TransferReversalStatus = z.infer<typeof transferReversalStatusSchema>
export type TransferReversalReason = z.infer<typeof transferReversalReasonSchema>

export const transferReversalDtoSchema = z.object({
  id: z.string(),
  businessPayableId: z.string(),
  paymentId: z.string(),
  bookingId: z.string(),
  refundId: z.string().nullable(),
  status: transferReversalStatusSchema,
  amount: z.string(),
  currency: z.string(),
  reason: transferReversalReasonSchema,
  stripeTransferIdPresent: z.boolean(),
  stripeTransferReversalIdPresent: z.boolean(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  processingAt: z.string().datetime().nullable(),
  succeededAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
})

export type TransferReversalDto = z.infer<typeof transferReversalDtoSchema>
