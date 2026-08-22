import { z } from 'zod'

export const communityTypeSchema = z.enum(['DESTINATION', 'INTEREST', 'TRANSPORT', 'OFFICIAL'])
export const communityPrivacySchema = z.enum(['PUBLIC', 'PRIVATE'])
export const communityMembershipStatusSchema = z.enum(['none', 'joined', 'requested', 'moderator'])
export const communityThreadKindSchema = z.enum(['QUESTION', 'DISCUSSION'])

export type CommunityType = z.infer<typeof communityTypeSchema>
export type CommunityPrivacy = z.infer<typeof communityPrivacySchema>
export type CommunityMembershipStatus = z.infer<typeof communityMembershipStatusSchema>
export type CommunityThreadKind = z.infer<typeof communityThreadKindSchema>

export const communityDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  communityType: communityTypeSchema,
  destination: z.string(),
  topics: z.array(z.string()),
  coverUrl: z.string().nullable(),
  privacy: communityPrivacySchema,
  official: z.boolean(),
  businessManaged: z.boolean(),
  memberCount: z.number().int().nonnegative(),
  lastActivityAt: z.string().datetime(),
  membershipStatus: communityMembershipStatusSchema,
})

export type CommunityDto = z.infer<typeof communityDtoSchema>

export const communityJoinResultSchema = z.object({
  community: communityDtoSchema,
  membershipStatus: communityMembershipStatusSchema,
})

export type CommunityJoinResult = z.infer<typeof communityJoinResultSchema>

export const communityAuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})

export type CommunityAuthor = z.infer<typeof communityAuthorSchema>

export const communityAnswerDtoSchema = z.object({
  id: z.string(),
  body: z.string(),
  helpfulCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  author: communityAuthorSchema,
  isAccepted: z.boolean(),
})

export type CommunityAnswerDto = z.infer<typeof communityAnswerDtoSchema>

export const communityThreadSummarySchema = z.object({
  id: z.string(),
  kind: communityThreadKindSchema,
  title: z.string(),
  body: z.string(),
  topic: z.string().nullable(),
  pinned: z.boolean(),
  official: z.boolean(),
  answerCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  author: communityAuthorSchema,
  community: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    destination: z.string(),
  }),
  acceptedAnswer: z
    .object({
      id: z.string(),
      body: z.string(),
      helpfulCount: z.number().int().nonnegative(),
      author: communityAuthorSchema,
    })
    .nullable(),
  savedByMe: z.boolean(),
})

export type CommunityThreadSummary = z.infer<typeof communityThreadSummarySchema>

export const communityThreadDetailSchema = communityThreadSummarySchema.extend({
  answers: z.array(communityAnswerDtoSchema),
  canAccept: z.boolean(),
})

export type CommunityThreadDetail = z.infer<typeof communityThreadDetailSchema>

export const createCommunityThreadBodySchema = z
  .object({
    kind: communityThreadKindSchema,
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().max(5000).optional(),
    topic: z.string().trim().max(80).optional().nullable(),
  })
  .strict()

export type CreateCommunityThreadBody = z.infer<typeof createCommunityThreadBodySchema>

export const createCommunityAnswerBodySchema = z
  .object({
    body: z.string().trim().min(1).max(4000),
  })
  .strict()

export type CreateCommunityAnswerBody = z.infer<typeof createCommunityAnswerBodySchema>

export const communityJoinRequestSchema = z.object({
  userId: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  requestedAt: z.string().datetime(),
})

export type CommunityJoinRequest = z.infer<typeof communityJoinRequestSchema>
