import { z } from 'zod'

export const journeyVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE', 'DRAFT'])
export const journeyPartyTypeSchema = z.enum(['SOLO', 'COUPLE', 'FAMILY', 'GROUP', 'FRIENDS'])
export const journeyLifecycleStatusSchema = z.enum(['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED'])
export const journeyCoverResourceTypeSchema = z.enum(['image', 'video'])

export type JourneyVisibility = z.infer<typeof journeyVisibilitySchema>
export type JourneyPartyType = z.infer<typeof journeyPartyTypeSchema>
export type JourneyLifecycleStatus = z.infer<typeof journeyLifecycleStatusSchema>

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
  mediaResourceTypes: z.array(journeyCoverResourceTypeSchema).optional(),
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
  coverResourceType: journeyCoverResourceTypeSchema.nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  lifecycleStatus: journeyLifecycleStatusSchema.optional(),
  startPlace: z.string(),
  endPlace: z.string(),
  countries: z.array(z.string()),
  durationDays: z.number().int().positive(),
  stopCount: z.number().int().nonnegative(),
  stopPreview: z.array(z.string()).optional(),
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
  events: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        coverUrl: z.string().nullable(),
        startAt: z.string().datetime(),
        city: z.string().nullable(),
        locationName: z.string().nullable(),
        category: z.string().nullable(),
      }),
    )
    .optional(),
  deals: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        coverUrl: z.string().nullable(),
        discountSummary: z.string(),
        city: z.string().nullable(),
        endDate: z.string().datetime(),
      }),
    )
    .optional(),
  bookings: z
    .array(
      z.object({
        id: z.string(),
        bookingReference: z.string(),
        listingTitle: z.string(),
        status: z.string(),
        startDateTime: z.string().datetime().nullable(),
        finalAmount: z.string(),
        currency: z.string(),
      }),
    )
    .optional(),
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
    mediaResourceTypes: z.array(journeyCoverResourceTypeSchema).max(10).optional(),
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
    coverResourceType: journeyCoverResourceTypeSchema.optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
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

export const journeyListQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    filter: z.enum(['forYou', 'following', 'trending', 'nearby']).optional(),
    destination: z.string().trim().max(80).optional(),
  })
  .strict()

export type JourneyListQuery = z.infer<typeof journeyListQuerySchema>

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

export const addJourneyEventBodySchema = z
  .object({
    eventId: z.string().min(1),
  })
  .strict()

export type AddJourneyEventBody = z.infer<typeof addJourneyEventBodySchema>

export const addJourneyDealBodySchema = z
  .object({
    dealId: z.string().min(1),
  })
  .strict()

export type AddJourneyDealBody = z.infer<typeof addJourneyDealBodySchema>

export const addJourneyBookingBodySchema = z
  .object({
    bookingId: z.string().min(1),
  })
  .strict()

export type AddJourneyBookingBody = z.infer<typeof addJourneyBookingBodySchema>

// ─── My Journeys Personalisation ─────────────────────────────────────────────

/** Shape returned by GET /journeys/mine/personalisation */
export const journeyPersonalisationDtoSchema = z.object({
  journeyId: z.string(),
  customTitle: z.string().nullable(),
  notes: z.string().nullable(),
  sortOrder: z.number().int().nullable(),
})

export type JourneyPersonalisationDto = z.infer<typeof journeyPersonalisationDtoSchema>

/** PATCH /journeys/:journeyId/personalisation — update title or notes for one journey */
export const patchJourneyPersonalisationBodySchema = z
  .object({
    customTitle: z.string().trim().max(200).nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .strict()

export type PatchJourneyPersonalisationBody = z.infer<typeof patchJourneyPersonalisationBodySchema>

/** PATCH /journeys/mine/order — save the user's custom display order */
export const patchJourneyOrderBodySchema = z
  .object({
    /** Ordered array of journey IDs (only IDs the user actually owns). */
    orderedIds: z.array(z.string().min(1)).max(200),
  })
  .strict()

export type PatchJourneyOrderBody = z.infer<typeof patchJourneyOrderBodySchema>
