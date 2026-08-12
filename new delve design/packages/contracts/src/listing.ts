import { z } from 'zod'
import { mediaAssetSchema } from './media.js'

export const listingStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'])

export const createListingBodySchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(4000).optional(),
  })
  .strict()

export const updateListingBodySchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    status: listingStatusSchema.optional(),
    coverMediaId: z.string().min(1).nullable().optional(),
  })
  .strict()

export const listingMediaDtoSchema = mediaAssetSchema.extend({
  isCover: z.boolean(),
})

export const listingDtoSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: listingStatusSchema,
  coverMediaId: z.string().nullable(),
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
export type ListingDto = z.infer<typeof listingDtoSchema>
export type ListingBusinessSummary = z.infer<typeof listingBusinessSummarySchema>
export type ListingPublicDto = z.infer<typeof listingPublicDtoSchema>
