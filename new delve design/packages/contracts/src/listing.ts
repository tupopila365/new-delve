import { z } from 'zod'
import { mediaAssetSchema } from './media.js'

export const listingStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'])

export const isoCurrencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'Currency must be a 3-letter ISO code.')
  .transform(v => v.toUpperCase())

function refineListingPricePair(
  data: { priceAmount?: number | null; currency?: string | null },
  ctx: z.RefinementCtx,
) {
  const hasAmount = data.priceAmount != null
  const hasCurrency = Boolean(data.currency)
  if (hasAmount !== hasCurrency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: hasAmount ? ['currency'] : ['priceAmount'],
      message: 'priceAmount and currency must be provided together, or both omitted.',
    })
  }
}

export const createListingBodySchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(4000).optional(),
    businessAreaId: z.string().min(1).nullable().optional(),
    priceAmount: z.number().finite().gte(0).nullable().optional(),
    currency: isoCurrencyCodeSchema.nullable().optional(),
  })
  .strict()
  .superRefine(refineListingPricePair)

export const updateListingBodySchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    businessAreaId: z.string().min(1).nullable().optional(),
    status: listingStatusSchema.optional(),
    coverMediaId: z.string().min(1).nullable().optional(),
    priceAmount: z.number().finite().gte(0).nullable().optional(),
    currency: isoCurrencyCodeSchema.nullable().optional(),
  })
  .strict()
  .superRefine(refineListingPricePair)

export const listingMediaDtoSchema = mediaAssetSchema.extend({
  isCover: z.boolean(),
})

export const listingPricingDtoSchema = z.object({
  amount: z.string(),
  currency: z.string(),
})

export const listingBusinessAreaSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
})

export const listingDtoSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  businessAreaId: z.string().nullable().default(null),
  businessArea: listingBusinessAreaSummarySchema.nullable().default(null),
  title: z.string(),
  description: z.string().nullable(),
  status: listingStatusSchema,
  coverMediaId: z.string().nullable(),
  pricing: listingPricingDtoSchema.nullable(),
  media: z.array(listingMediaDtoSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

/** Nested business summary on traveler-facing listing responses. */
export const listingBusinessSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  category: z.string().nullable(),
})

/** Public listing — published only; includes business for discovery filters/links. */
export const listingPublicDtoSchema = listingDtoSchema.extend({
  business: listingBusinessSummarySchema,
})

export type ListingStatus = z.infer<typeof listingStatusSchema>
export type CreateListingBody = z.infer<typeof createListingBodySchema>
export type UpdateListingBody = z.infer<typeof updateListingBodySchema>
export type ListingMediaDto = z.infer<typeof listingMediaDtoSchema>
export type ListingBusinessAreaSummary = z.infer<typeof listingBusinessAreaSummarySchema>
export type ListingDto = z.infer<typeof listingDtoSchema>
export type ListingPricing = z.infer<typeof listingPricingDtoSchema>
export type ListingBusinessSummary = z.infer<typeof listingBusinessSummarySchema>
export type ListingPublicDto = z.infer<typeof listingPublicDtoSchema>
