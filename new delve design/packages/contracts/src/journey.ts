import { z } from 'zod'

export const journeyVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE', 'DRAFT'])
export const journeyPartyTypeSchema = z.enum(['SOLO', 'COUPLE', 'FAMILY', 'GROUP', 'FRIENDS'])

export type JourneyVisibility = z.infer<typeof journeyVisibilitySchema>
export type JourneyPartyType = z.infer<typeof journeyPartyTypeSchema>

export const journeyAuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})

export type JourneyAuthor = z.infer<typeof journeyAuthorSchema>

export const journeyStopDtoSchema = z.object({
  id: z.string(),
  sortOrder: z.number().int(),
  place: z.string(),
  region: z.string(),
  arrivalDay: z.number().int(),
  durationDays: z.number().int(),
  notes: z.string(),
  highlights: z.array(z.string()),
  mediaUrls: z.array(z.string()),
  transportModeToNext: z.string().nullable(),
  transportDurationToNext: z.string().nullable(),
  transportNotes: z.string().nullable(),
  historicalCostHint: z.string().nullable(),
})

export type JourneyStopDto = z.infer<typeof journeyStopDtoSchema>

export const journeySummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  coverUrl: z.string().nullable(),
  startPlace: z.string(),
  endPlace: z.string(),
  countries: z.array(z.string()),
  durationDays: z.number().int().positive(),
  stopCount: z.number().int().nonnegative(),
  transportModes: z.array(z.string()),
  historicalCost: z.string().nullable(),
  currency: z.string(),
  partyType: journeyPartyTypeSchema,
  tags: z.array(z.string()),
  visibility: journeyVisibilitySchema,
  takeaway: z.string(),
  viewCount: z.number().int().nonnegative(),
  saveCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  author: journeyAuthorSchema,
  savedByMe: z.boolean(),
  likedByMe: z.boolean(),
})

export type JourneySummary = z.infer<typeof journeySummarySchema>

export const journeyDetailSchema = journeySummarySchema.extend({
  stops: z.array(journeyStopDtoSchema),
  media: z.array(z.string()),
})

export type JourneyDetail = z.infer<typeof journeyDetailSchema>

export const createJourneyStopBodySchema = z
  .object({
    place: z.string().trim().min(1).max(120),
    region: z.string().trim().max(120).optional(),
    arrivalDay: z.number().int().min(1).max(365).optional(),
    durationDays: z.number().int().min(1).max(90).optional(),
    notes: z.string().trim().max(4000).optional(),
    highlights: z.array(z.string().trim().max(120)).max(20).optional(),
    mediaUrls: z.array(z.string().trim().min(1).max(2000)).max(10).optional(),
    transportModeToNext: z.string().trim().max(80).optional().nullable(),
    transportDurationToNext: z.string().trim().max(80).optional().nullable(),
    transportNotes: z.string().trim().max(500).optional().nullable(),
    historicalCostHint: z.string().trim().max(120).optional().nullable(),
  })
  .strict()

export const createJourneyBodySchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    summary: z.string().trim().max(2000).optional(),
    coverUrl: z.string().trim().max(2000).optional().nullable(),
    startPlace: z.string().trim().min(1).max(120),
    endPlace: z.string().trim().min(1).max(120),
    countries: z.array(z.string().trim().max(80)).max(20).optional(),
    durationDays: z.number().int().min(1).max(365).optional(),
    transportModes: z.array(z.string().trim().max(80)).max(20).optional(),
    historicalCost: z.string().trim().max(40).optional().nullable(),
    currency: z.string().trim().max(8).optional(),
    partyType: journeyPartyTypeSchema.optional(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
    visibility: journeyVisibilitySchema.optional(),
    takeaway: z.string().trim().max(2000).optional(),
    stops: z.array(createJourneyStopBodySchema).min(1).max(40),
  })
  .strict()

export type CreateJourneyBody = z.infer<typeof createJourneyBodySchema>

/** Full replace update (same shape as create). */
export const updateJourneyBodySchema = createJourneyBodySchema
export type UpdateJourneyBody = z.infer<typeof updateJourneyBodySchema>

export const journeyCommentDtoSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
  author: journeyAuthorSchema,
})

export type JourneyCommentDto = z.infer<typeof journeyCommentDtoSchema>

export const createJourneyCommentBodySchema = z
  .object({
    body: z.string().trim().min(1).max(1000),
  })
  .strict()

export type CreateJourneyCommentBody = z.infer<typeof createJourneyCommentBodySchema>
