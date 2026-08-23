import { z } from 'zod'
import { communityDtoSchema, communityThreadSummarySchema } from './community.js'
import { journeySummarySchema } from './journey.js'
import { eventDtoSchema, postDtoSchema, publicTravelerProfileSchema } from './social.js'

export const searchEntityTypeSchema = z.enum([
  'traveler',
  'post',
  'community',
  'thread',
  'journey',
  'event',
  'query',
])

export type SearchEntityType = z.infer<typeof searchEntityTypeSchema>

export const unifiedSearchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(200),
    types: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(80).optional(),
  })
  .strict()

export type UnifiedSearchQuery = z.infer<typeof unifiedSearchQuerySchema>

export const unifiedSearchResultSchema = z.object({
  travelers: z.array(publicTravelerProfileSchema),
  posts: z.array(postDtoSchema),
  communities: z.array(communityDtoSchema),
  threads: z.array(communityThreadSummarySchema),
  journeys: z.array(journeySummarySchema),
  events: z.array(eventDtoSchema),
})

export type UnifiedSearchResult = z.infer<typeof unifiedSearchResultSchema>

export const searchSuggestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  context: z.string(),
  type: z.string(),
  group: z.enum(['journey', 'community', 'thread', 'event', 'traveler', 'post', 'recent']),
  entityType: searchEntityTypeSchema,
  entityId: z.string(),
})

export type SearchSuggestion = z.infer<typeof searchSuggestionSchema>

export const searchSuggestQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(200),
  })
  .strict()

export type SearchSuggestQuery = z.infer<typeof searchSuggestQuerySchema>
