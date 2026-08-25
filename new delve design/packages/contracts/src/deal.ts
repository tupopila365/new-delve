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

export const dealClaimMethodSchema = z.enum(['IN_APP', 'SHOW_CODE', 'BOOKING_CODE', 'LINK'])
export const dealClaimStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'REDEEMED', 'CANCELLED', 'EXPIRED'])
export const dealReportReasonSchema = z.enum(['SPAM', 'MISLEADING', 'INAPPROPRIATE', 'SCAM', 'OTHER'])
export const dealReportStatusSchema = z.enum(['OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED'])
export const dealAnalyticsKindSchema = z.enum(['IMPRESSION', 'CLICK', 'CLAIM', 'SAVE', 'JOURNEY_ADD', 'REDEEM'])
export const dealPublicSortSchema = z.enum(['endingSoon', 'newest', 'featured', 'discount'])

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

const extraDealFields = {
  coverMediaId: z.string().min(1).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  countryCode: z.string().trim().length(2).transform(v => v.toUpperCase()).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  claimMethod: dealClaimMethodSchema.optional(),
  maxClaims: z.number().int().positive().max(1_000_000).nullable().optional(),
  terms: z.string().trim().max(8000).nullable().optional(),
  eligibility: z.string().trim().max(4000).nullable().optional(),
  included: z.string().trim().max(4000).nullable().optional(),
  excluded: z.string().trim().max(4000).nullable().optional(),
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
    status: z.enum(['DRAFT', 'PENDING_REVIEW']).optional(),
    ...extraDealFields,
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
    status: z.enum(['DRAFT', 'PENDING_REVIEW']).optional(),
    ...extraDealFields,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.discountType !== undefined && data.discountValue !== undefined) {
      refineDiscount(
        { discountType: data.discountType, discountValue: data.discountValue },
        ctx,
      )
    }
    if (data.startDate && data.endDate) {
      refineDates({ startDate: data.startDate, endDate: data.endDate }, ctx)
    }
  })

export const publicDealsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    businessId: z.string().min(1).optional(),
    q: z.string().trim().max(200).optional(),
    category: z.string().trim().max(80).optional(),
    city: z.string().trim().max(120).optional(),
    sort: dealPublicSortSchema.optional(),
    featured: z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .transform(v => (v === undefined ? undefined : v === 'true' || v === '1')),
    includeScheduled: z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .transform(v => (v === undefined ? undefined : v === 'true' || v === '1')),
  })
  .strict()

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

export const dealPricingDtoSchema = z.object({
  currency: z.string(),
  originalAmount: z.string(),
  dealAmount: z.string(),
  savingAmount: z.string(),
  discountPercentage: z.number(),
})

export const dealPricePreviewBodySchema = z
  .object({
    listingId: z.string().min(1),
    discountType: dealDiscountTypeSchema,
    discountValue: z.number().finite(),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform(v => v.toUpperCase())
      .optional(),
  })
  .strict()

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
  isScheduled: z.boolean(),
  discountSummary: z.string(),
  coverUrl: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  category: z.string().nullable(),
  featured: z.boolean(),
  featuredRank: z.number().int().nullable(),
  claimMethod: dealClaimMethodSchema,
  maxClaims: z.number().int().nullable(),
  terms: z.string().nullable(),
  eligibility: z.string().nullable(),
  included: z.string().nullable(),
  excluded: z.string().nullable(),
  viewCount: z.number().int(),
  claimCount: z.number().int(),
  listing: dealListingSummarySchema.nullable(),
  business: dealBusinessSummarySchema,
  pricing: dealPricingDtoSchema.nullable(),
  isPreview: z.boolean().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const dealClaimValidationStatusSchema = z.enum([
  'VALID',
  'ALREADY_REDEEMED',
  'EXPIRED',
  'CANCELLED',
  'INVALID',
])

export const dealClaimDtoSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  userId: z.string(),
  status: dealClaimStatusSchema,
  code: z.string(),
  note: z.string().nullable(),
  titleSnapshot: z.string(),
  discountTypeSnapshot: dealDiscountTypeSchema,
  discountValueSnapshot: z.number(),
  currencySnapshot: z.string(),
  originalPriceSnapshot: z.number().nullable(),
  dealPriceSnapshot: z.number().nullable(),
  /** Derived from snapshots on read. Null when historical claims have no money snapshots. */
  savingAmountSnapshot: z.number().nullable(),
  discountSummarySnapshot: z.string(),
  termsSnapshot: z.string().nullable(),
  eligibilitySnapshot: z.string().nullable(),
  includedSnapshot: z.string().nullable(),
  excludedSnapshot: z.string().nullable(),
  redemptionInstructionsSnapshot: z.string().nullable(),
  expiresAt: z.string().datetime(),
  redeemedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deal: dealDtoSchema.optional(),
  traveler: z.object({ displayName: z.string() }).optional(),
})

export const dealClaimLookupDtoSchema = z.object({
  claimId: z.string(),
  claimCode: z.string(),
  status: dealClaimStatusSchema,
  validationStatus: dealClaimValidationStatusSchema,
  claimedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  redeemedAt: z.string().datetime().nullable(),
  deal: z.object({
    id: z.string(),
    title: z.string(),
  }),
  traveler: z.object({
    displayName: z.string(),
  }),
  pricing: z.object({
    discountTypeSnapshot: dealDiscountTypeSchema,
    discountValueSnapshot: z.number(),
    currencySnapshot: z.string(),
    discountSummarySnapshot: z.string(),
    dealPriceSnapshot: z.number().nullable(),
    originalPriceSnapshot: z.number().nullable(),
    savingAmountSnapshot: z.number().nullable(),
  }),
})

export const lookupDealClaimQuerySchema = z
  .object({
    code: z.string().trim().min(3).max(64),
  })
  .strict()

export const businessDealClaimsQuerySchema = z
  .object({
    filter: z.enum(['active', 'redeemed', 'expired', 'cancelled', 'all']).optional(),
  })
  .strict()

export const createDealClaimBodySchema = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .strict()

export const updateDealClaimBodySchema = z
  .object({
    status: dealClaimStatusSchema,
  })
  .strict()

export const createDealReportBodySchema = z
  .object({
    reason: dealReportReasonSchema,
    details: z.string().trim().max(2000).optional(),
  })
  .strict()

export const dealReportDtoSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  reporterId: z.string(),
  reason: dealReportReasonSchema,
  details: z.string().nullable(),
  status: dealReportStatusSchema,
  /** Present on admin responses only. Never returned to travelers. */
  resolution: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  deal: dealDtoSchema.optional(),
})

export const resolveDealReportBodySchema = z
  .object({
    status: z.enum(['REVIEWED', 'DISMISSED', 'ACTIONED']),
    resolution: z.string().trim().max(2000).optional(),
  })
  .strict()

export const adminModerateDealBodySchema = z
  .object({
    action: z.enum(['approve', 'reject', 'archive']),
    reason: z.string().trim().max(500).optional(),
  })
  .strict()

export const adminFeatureDealBodySchema = z
  .object({
    featured: z.boolean(),
    featuredRank: z.number().int().min(0).max(9999).nullable().optional(),
  })
  .strict()

export const recordDealAnalyticsBodySchema = z
  .object({
    kind: z.enum(['IMPRESSION', 'CLICK']),
  })
  .strict()

export const dealAnalyticsSummarySchema = z.object({
  impressions: z.number().int(),
  clicks: z.number().int(),
  claims: z.number().int(),
  redemptions: z.number().int(),
  saves: z.number().int(),
  journeyAdds: z.number().int(),
})

export type DealDiscountType = z.infer<typeof dealDiscountTypeSchema>
export type DealStatus = z.infer<typeof dealStatusSchema>
export type DealClaimMethod = z.infer<typeof dealClaimMethodSchema>
export type DealClaimStatus = z.infer<typeof dealClaimStatusSchema>
export type DealReportReason = z.infer<typeof dealReportReasonSchema>
export type CreateDealBody = z.infer<typeof createDealBodySchema>
export type UpdateDealBody = z.infer<typeof updateDealBodySchema>
export type DealDto = z.infer<typeof dealDtoSchema>
export type DealPricing = z.infer<typeof dealPricingDtoSchema>
export type PublicDealsQuery = z.infer<typeof publicDealsQuerySchema>
export type DealClaimDto = z.infer<typeof dealClaimDtoSchema>
export type DealClaimLookupDto = z.infer<typeof dealClaimLookupDtoSchema>
export type DealClaimValidationStatus = z.infer<typeof dealClaimValidationStatusSchema>
export type DealReportDto = z.infer<typeof dealReportDtoSchema>
export type DealAnalyticsSummary = z.infer<typeof dealAnalyticsSummarySchema>
export type CreateDealClaimBody = z.infer<typeof createDealClaimBodySchema>
export type UpdateDealClaimBody = z.infer<typeof updateDealClaimBodySchema>
export type CreateDealReportBody = z.infer<typeof createDealReportBodySchema>
export type ResolveDealReportBody = z.infer<typeof resolveDealReportBodySchema>
export type AdminModerateDealBody = z.infer<typeof adminModerateDealBodySchema>
export type AdminFeatureDealBody = z.infer<typeof adminFeatureDealBodySchema>
export type RecordDealAnalyticsBody = z.infer<typeof recordDealAnalyticsBodySchema>
