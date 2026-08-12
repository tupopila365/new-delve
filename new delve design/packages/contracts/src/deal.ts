import { z } from 'zod'

export const dealDiscountTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT'])

export const dealStatusSchema = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'EXPIRED',
  'REJECTED',
  'ARCHIVED',
])

const discountFields = {
  discountType: dealDiscountTypeSchema,
  discountValue: z.number().finite(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform(v => v.toUpperCase())
    .optional(),
}

function refineDiscount(
  data: { discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'; discountValue: number },
  ctx: z.RefinementCtx,
) {
  if (data.discountType === 'PERCENTAGE') {
    if (data.discountValue <= 0 || data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Percentage discount must be greater than 0 and at most 100.',
      })
    }
  } else if (data.discountValue < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountValue'],
      message: 'Fixed discount must not be negative.',
    })
  } else if (data.discountValue > 1_000_000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountValue'],
      message: 'Fixed discount is too large.',
    })
  }
}

function refineDates(
  data: { startDate: string; endDate: string },
  ctx: z.RefinementCtx,
) {
  const start = Date.parse(data.startDate)
  const end = Date.parse(data.endDate)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startDate'],
      message: 'startDate and endDate must be valid ISO datetimes.',
    })
    return
  }
  if (start >= end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'startDate must be before endDate.',
    })
  }
}

export const createDealBodySchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(4000).optional(),
    listingId: z.string().min(1).nullable().optional(),
    ...discountFields,
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED']).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    refineDiscount(data, ctx)
    refineDates(data, ctx)
  })

export const updateDealBodySchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    listingId: z.string().min(1).nullable().optional(),
    discountType: dealDiscountTypeSchema.optional(),
    discountValue: z.number().finite().optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform(v => v.toUpperCase())
      .optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED']).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.discountType !== undefined && data.discountValue !== undefined) {
      refineDiscount(
        { discountType: data.discountType, discountValue: data.discountValue },
        ctx,
      )
    } else if (data.discountType === 'PERCENTAGE' && data.discountValue === undefined) {
      /* type-only change validated at service with existing value */
    } else if (data.discountValue !== undefined && data.discountType === undefined) {
      /* value-only change validated at service with existing type */
    }
    if (data.startDate && data.endDate) {
      refineDates({ startDate: data.startDate, endDate: data.endDate }, ctx)
    }
  })

export const dealListingSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
})

export const dealBusinessSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
})

export const dealDtoSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  listingId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  discountType: dealDiscountTypeSchema,
  discountValue: z.number(),
  currency: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: dealStatusSchema,
  /** True when PUBLISHED and now is within [startDate, endDate]. */
  isActive: z.boolean(),
  discountSummary: z.string(),
  listing: dealListingSummarySchema.nullable(),
  business: dealBusinessSummarySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type DealDiscountType = z.infer<typeof dealDiscountTypeSchema>
export type DealStatus = z.infer<typeof dealStatusSchema>
export type CreateDealBody = z.infer<typeof createDealBodySchema>
export type UpdateDealBody = z.infer<typeof updateDealBodySchema>
export type DealDto = z.infer<typeof dealDtoSchema>
