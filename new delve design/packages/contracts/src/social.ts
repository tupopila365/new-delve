import { z } from 'zod'
import { eventMediaDtoSchema } from './event-media.js'

export const publicTravelerProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  bio: z.string().nullable(),
  homeCity: z.string().nullable(),
  homeCountryCode: z.string().nullable(),
  preferredLanguage: z.string(),
  interests: z.array(z.string()),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  profileVisibility: z.enum(['PUBLIC', 'PRIVATE']),
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  delversCount: z.number().int().nonnegative(),
  isFollowing: z.boolean().optional(),
})

export type PublicTravelerProfile = z.infer<typeof publicTravelerProfileSchema>

export const followResultSchema = z.object({
  following: z.boolean(),
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
})

export type FollowResult = z.infer<typeof followResultSchema>

export const followListItemSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  isFollowing: z.boolean(),
  followsYou: z.boolean(),
})

export type FollowListItem = z.infer<typeof followListItemSchema>

export const followListSchema = z.object({
  items: z.array(followListItemSchema),
  nextCursor: z.string().nullable(),
})

export type FollowList = z.infer<typeof followListSchema>

export const createPostBodySchema = z
  .object({
    caption: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(120).optional().nullable(),
    visibility: z.enum(['PUBLIC', 'FOLLOWERS', 'PRIVATE']).optional(),
    mediaIds: z.array(z.string().min(1)).max(10).optional(),
    /** Share an event into Delvers as a reference (not a data duplicate). */
    eventId: z.string().min(1).optional().nullable(),
    /** Share a journey into Delvers as a reference (not a data duplicate). */
    journeyId: z.string().min(1).optional().nullable(),
  })
  .strict()

export type CreatePostBody = z.infer<typeof createPostBodySchema>

export const postMediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  resourceType: z.string(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
})

export const postAuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})

export const postLinkedEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  coverUrl: z.string().nullable(),
  coverResourceType: z.enum(['image', 'video']).nullable().optional(),
  startAt: z.string().datetime(),
  city: z.string().nullable(),
  locationName: z.string().nullable(),
})

export type PostLinkedEvent = z.infer<typeof postLinkedEventSchema>

export const postLinkedJourneySchema = z.object({
  id: z.string(),
  title: z.string(),
  coverUrl: z.string().nullable(),
  startPlace: z.string(),
  endPlace: z.string(),
  durationDays: z.number().int().positive(),
  stopCount: z.number().int().nonnegative(),
})

export type PostLinkedJourney = z.infer<typeof postLinkedJourneySchema>

export const postDtoSchema = z.object({
  id: z.string(),
  caption: z.string(),
  location: z.string().nullable(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS', 'PRIVATE']),
  createdAt: z.string().datetime(),
  author: postAuthorSchema,
  media: z.array(postMediaSchema),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  savedByMe: z.boolean().optional(),
  linkedEvent: postLinkedEventSchema.nullable().optional(),
  linkedJourney: postLinkedJourneySchema.nullable().optional(),
})

export type PostDto = z.infer<typeof postDtoSchema>

export const createCommentBodySchema = z
  .object({
    body: z.string().trim().min(1).max(1000),
  })
  .strict()

export const commentDtoSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
  author: postAuthorSchema,
})

export type CommentDto = z.infer<typeof commentDtoSchema>

export const saveBodySchema = z
  .object({
    targetType: z.enum(['POST', 'LISTING', 'DEAL', 'EVENT', 'COMMUNITY_THREAD', 'JOURNEY']),
    targetId: z.string().min(1),
  })
  .strict()

export type SaveBody = z.infer<typeof saveBodySchema>

export const saveDtoSchema = z.object({
  id: z.string(),
  targetType: z.enum(['POST', 'LISTING', 'DEAL', 'EVENT', 'COMMUNITY_THREAD', 'JOURNEY']),
  targetId: z.string(),
  createdAt: z.string().datetime(),
  preview: z
    .object({
      title: z.string().optional(),
      imageUrl: z.string().nullable().optional(),
      subtitle: z.string().optional(),
    })
    .optional(),
})

export type SaveDto = z.infer<typeof saveDtoSchema>

export const createEventBodySchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(4000).optional(),
    coverMediaId: z.string().min(1).optional().nullable(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime().optional().nullable(),
    timezone: z.string().trim().max(64).optional().nullable(),
    locationName: z.string().trim().max(160).optional().nullable(),
    city: z.string().trim().max(80).optional().nullable(),
    country: z.string().trim().max(80).optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    category: z.string().trim().max(60).optional().nullable(),
    communityId: z.string().min(1).optional().nullable(),
    businessId: z.string().min(1).optional().nullable(),
    visibility: z.enum(['PUBLIC', 'FOLLOWERS', 'PRIVATE']).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    maxAttendees: z.number().int().positive().optional().nullable(),
  })
  .strict()

export type CreateEventBody = z.infer<typeof createEventBodySchema>

export const updateEventBodySchema = createEventBodySchema
  .partial()
  .extend({
    status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
  })
  .strict()

export type UpdateEventBody = z.infer<typeof updateEventBodySchema>

export const eventListQuerySchema = z
  .object({
    city: z.string().trim().max(80).optional(),
    after: z.string().datetime().optional(),
    mine: z.enum(['hosting', 'attending']).optional(),
    category: z.string().trim().max(60).optional(),
    following: z.enum(['true']).optional(),
    sort: z.enum(['popular']).optional(),
  })
  .strict()

export type EventListQuery = z.infer<typeof eventListQuerySchema>

export const eventCommunityRefSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
})

export const eventBusinessRefSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
})

export const eventDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  coverUrl: z.string().nullable(),
  coverMediaId: z.string().nullable().optional(),
  coverResourceType: z.enum(['image', 'video']).nullable().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable(),
  timezone: z.string().nullable(),
  locationName: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  category: z.string().nullable(),
  communityId: z.string().nullable().optional(),
  businessId: z.string().nullable().optional(),
  community: eventCommunityRefSchema.nullable().optional(),
  business: eventBusinessRefSchema.nullable().optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS', 'PRIVATE']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']),
  maxAttendees: z.number().int().nullable(),
  goingCount: z.number().int().nonnegative(),
  interestedCount: z.number().int().nonnegative(),
  myAttendance: z.enum(['GOING', 'INTERESTED']).nullable(),
  isOwner: z.boolean().optional(),
  savedByMe: z.boolean().optional(),
  likeCount: z.number().int().nonnegative().optional(),
  likedByMe: z.boolean().optional(),
  canUploadMedia: z.boolean().optional(),
  media: z.array(eventMediaDtoSchema).optional(),
  creator: postAuthorSchema,
  createdAt: z.string().datetime(),
})

export type EventDto = z.infer<typeof eventDtoSchema>

export const eventAttendeeDtoSchema = z.object({
  user: postAuthorSchema,
  status: z.enum(['GOING', 'INTERESTED']),
  updatedAt: z.string().datetime(),
})

export type EventAttendeeDto = z.infer<typeof eventAttendeeDtoSchema>

export const eventAttendeesQuerySchema = z
  .object({
    status: z.enum(['GOING', 'INTERESTED']).optional(),
  })
  .strict()

export type EventAttendeesQuery = z.infer<typeof eventAttendeesQuerySchema>

export const attendanceBodySchema = z
  .object({
    status: z.enum(['GOING', 'INTERESTED']),
  })
  .strict()

export const notificationDtoSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  actorId: z.string().nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})

export type NotificationDto = z.infer<typeof notificationDtoSchema>

export const createStoryBodySchema = z
  .object({
    mediaIds: z.array(z.string().min(1)).min(1).max(5),
    caption: z.string().trim().max(200).optional(),
    location: z.string().trim().max(120).optional().nullable(),
  })
  .strict()

export type CreateStoryBody = z.infer<typeof createStoryBodySchema>

export const storySlideDtoSchema = z.object({
  id: z.string(),
  caption: z.string(),
  location: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  media: postMediaSchema,
})

export type StorySlideDto = z.infer<typeof storySlideDtoSchema>

export const storyAuthorDtoSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  isOwn: z.boolean(),
  unseen: z.boolean(),
  latestAt: z.string().datetime(),
  slideCount: z.number().int().positive(),
})

export type StoryAuthorDto = z.infer<typeof storyAuthorDtoSchema>

export const storyRailDtoSchema = z.object({
  authors: z.array(storyAuthorDtoSchema),
})

export type StoryRailDto = z.infer<typeof storyRailDtoSchema>

export const storyViewerDtoSchema = z.object({
  author: postAuthorSchema,
  slides: z.array(storySlideDtoSchema),
})

export type StoryViewerDto = z.infer<typeof storyViewerDtoSchema>
