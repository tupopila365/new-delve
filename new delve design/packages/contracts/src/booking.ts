import { z } from 'zod'
import { bookingPaymentSummarySchema } from './payment.js'
import { bookingFinancialDtoSchema } from './refund.js'

export const bookingStatusSchema = z.enum([
  'PENDING',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'EXPIRED',
])

export type BookingStatus = z.infer<typeof bookingStatusSchema>

export const travelerBookingFilterSchema = z.enum(['upcoming', 'pending', 'completed', 'cancelled'])
export const providerBookingFilterSchema = z.enum(['pending', 'confirmed', 'completed', 'cancelled'])

export const createBookingBodySchema = z
  .object({
    listingId: z.string().min(1),
    dealClaimId: z.string().min(1).nullable().optional(),
    startDateTime: z.string().datetime().nullable().optional(),
    endDateTime: z.string().datetime().nullable().optional(),
    quantity: z.number().int().positive().max(50).optional(),
    guestCount: z.number().int().positive().max(200).nullable().optional(),
    customerNote: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startDateTime && data.endDateTime) {
      const start = Date.parse(data.startDateTime)
      const end = Date.parse(data.endDateTime)
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDateTime'],
          message: 'endDateTime must be on or after startDateTime.',
        })
      }
    }
  })

export type TravelerBookingFilter = z.infer<typeof travelerBookingFilterSchema>
export type ProviderBookingFilter = z.infer<typeof providerBookingFilterSchema>
export type CreateBookingBody = z.infer<typeof createBookingBodySchema>

export const cancelBookingBodySchema = z
  .object({
    reason: z.string().trim().max(500).nullable().optional(),
  })
  .strict()

export type CancelBookingBody = z.infer<typeof cancelBookingBodySchema>

export const travelerBookingsQuerySchema = z
  .object({
    filter: travelerBookingFilterSchema.optional(),
  })
  .strict()

export const providerBookingsQuerySchema = z
  .object({
    filter: providerBookingFilterSchema.optional(),
    q: z.string().trim().max(80).optional(),
  })
  .strict()

export const bookingPricingDtoSchema = z.object({
  originalAmount: z.string(),
  discountAmount: z.string(),
  finalAmount: z.string(),
  currency: z.string(),
})

export const bookingDtoSchema = z.object({
  id: z.string(),
  bookingReference: z.string(),
  status: bookingStatusSchema,
  listingId: z.string(),
  businessId: z.string(),
  dealId: z.string().nullable(),
  dealClaimId: z.string().nullable(),
  startDateTime: z.string().datetime().nullable(),
  endDateTime: z.string().datetime().nullable(),
  quantity: z.number().int(),
  guestCount: z.number().int().nullable(),
  customerNote: z.string().nullable(),
  pricing: bookingPricingDtoSchema,
  listing: z.object({
    id: z.string(),
    title: z.string(),
    coverUrl: z.string().nullable(),
  }),
  business: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    logoUrl: z.string().nullable(),
    city: z.string().nullable(),
    countryCode: z.string().nullable(),
  }),
  deal: z
    .object({
      id: z.string(),
      title: z.string(),
      discountSummary: z.string().nullable(),
    })
    .nullable(),
  traveler: z
    .object({
      displayName: z.string(),
    })
    .optional(),
  createdAt: z.string().datetime(),
  confirmedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  payment: bookingPaymentSummarySchema,
  financial: bookingFinancialDtoSchema.optional(),
})

export type BookingDto = z.infer<typeof bookingDtoSchema>
export type BookingPricing = z.infer<typeof bookingPricingDtoSchema>
