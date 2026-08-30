import { z } from 'zod'

export const communityTypeSchema = z.enum(['DESTINATION', 'INTEREST', 'TRANSPORT', 'OFFICIAL'])
export const communityPrivacySchema = z.enum(['PUBLIC', 'PRIVATE'])
export const communityMembershipStatusSchema = z.enum(['none', 'joined', 'requested', 'moderator', 'banned'])
export const communityMemberRoleSchema = z.enum(['owner', 'admin', 'moderator', 'member'])
export const communityCategorySchema = z.enum([
  'DESTINATION',
  'BACKPACKING',
  'ROAD_TRIPS',
  'SOLO_TRAVEL',
  'BUDGET_TRAVEL',
  'LUXURY_TRAVEL',
  'FOOD',
  'PHOTOGRAPHY',
  'ADVENTURE',
  'TRANSPORT',
  'ACCOMMODATION',
  'DIGITAL_NOMADS',
  'LOCAL_ADVICE',
  'EVENTS',
  'STUDENT_TRAVEL',
  'FAMILY_TRAVEL',
  'WOMEN_TRAVELERS',
  'OTHER',
])
export const communityThreadKindSchema = z.enum([
  'POST',
  'QUESTION',
  'TIP',
  'DISCUSSION',
  'RECOMMENDATION',
  'ANNOUNCEMENT',
  'JOURNEY_SHARE',
  'EVENT_SHARE',
])
export const communityThreadStatusSchema = z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'REMOVED'])
export const communityPostingPermissionSchema = z.enum(['MEMBERS', 'MODERATORS_ONLY', 'ADMINS_ONLY'])
export const communityDiscoverFilterSchema = z.enum(['forYou', 'trending', 'nearby', 'joined', 'new', 'mine'])

export type CommunityType = z.infer<typeof communityTypeSchema>
export type CommunityPrivacy = z.infer<typeof communityPrivacySchema>
export type CommunityMembershipStatus = z.infer<typeof communityMembershipStatusSchema>
export type CommunityMemberRole = z.infer<typeof communityMemberRoleSchema>
export type CommunityCategory = z.infer<typeof communityCategorySchema>
export type CommunityThreadKind = z.infer<typeof communityThreadKindSchema>
export type CommunityThreadStatus = z.infer<typeof communityThreadStatusSchema>
export type CommunityDiscoverFilter = z.infer<typeof communityDiscoverFilterSchema>

export const communityOwnerSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})

export type CommunityOwner = z.infer<typeof communityOwnerSchema>

export const communityDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  about: z.string(),
  communityType: communityTypeSchema,
  category: communityCategorySchema,
  destination: z.string(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  isGlobal: z.boolean(),
  topics: z.array(z.string()),
  avatarUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  privacy: communityPrivacySchema,
  requireJoinApproval: z.boolean(),
  requireRuleAcknowledgement: z.boolean(),
  requirePostApproval: z.boolean(),
  postingPermission: communityPostingPermissionSchema,
  official: z.boolean(),
  businessManaged: z.boolean(),
  memberCount: z.number().int().nonnegative(),
  postCount: z.number().int().nonnegative().optional(),
  lastActivityAt: z.string().datetime(),
  membershipStatus: communityMembershipStatusSchema,
  memberRole: communityMemberRoleSchema.nullable().optional(),
  owner: communityOwnerSchema.nullable().optional(),
  ruleCount: z.number().int().nonnegative().optional(),
})

export type CommunityDto = z.infer<typeof communityDtoSchema>

export const communityDetailSchema = communityDtoSchema.extend({
  canManage: z.boolean().optional(),
  canModerate: z.boolean().optional(),
  isOwner: z.boolean().optional(),
})

export type CommunityDetail = z.infer<typeof communityDetailSchema>

export const communityJoinResultSchema = z.object({
  community: communityDtoSchema,
  membershipStatus: communityMembershipStatusSchema,
})

export type CommunityJoinResult = z.infer<typeof communityJoinResultSchema>

export const createCommunityBodySchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(60)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
    description: z.string().trim().max(280).optional(),
    about: z.string().trim().max(5000).optional(),
    category: communityCategorySchema,
    communityType: communityTypeSchema.optional(),
    destination: z.string().trim().max(120).optional(),
    city: z.string().trim().max(80).optional().nullable(),
    country: z.string().trim().max(80).optional().nullable(),
    isGlobal: z.boolean().optional(),
    topics: z.array(z.string().trim().max(40)).max(12).optional(),
    avatarUrl: z.string().url().optional().nullable(),
    coverUrl: z.string().url().optional().nullable(),
    privacy: communityPrivacySchema.optional(),
    requireJoinApproval: z.boolean().optional(),
    requireRuleAcknowledgement: z.boolean().optional(),
    requirePostApproval: z.boolean().optional(),
    postingPermission: communityPostingPermissionSchema.optional(),
  })
  .strict()

export type CreateCommunityBody = z.infer<typeof createCommunityBodySchema>

export const updateCommunityBodySchema = createCommunityBodySchema
  .partial()
  .omit({ slug: true })
  .strict()

export type UpdateCommunityBody = z.infer<typeof updateCommunityBodySchema>

export const communityRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  sortOrder: z.number().int(),
})

export type CommunityRule = z.infer<typeof communityRuleSchema>

export const upsertCommunityRuleBodySchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })
  .strict()

export type UpsertCommunityRuleBody = z.infer<typeof upsertCommunityRuleBodySchema>

export const communityMemberSchema = z.object({
  userId: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: communityMemberRoleSchema,
  status: communityMembershipStatusSchema,
  joinedAt: z.string().datetime(),
})

export type CommunityMember = z.infer<typeof communityMemberSchema>

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
  status: communityThreadStatusSchema,
  title: z.string(),
  body: z.string(),
  topic: z.string().nullable(),
  locationName: z.string().nullable().optional(),
  mediaUrls: z.array(z.string()).optional(),
  pinned: z.boolean(),
  official: z.boolean(),
  answered: z.boolean().optional(),
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
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  linkedJourney: z
    .object({
      id: z.string(),
      title: z.string(),
      coverUrl: z.string().nullable(),
      durationDays: z.number().int().positive().nullable(),
      stopCount: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
  linkedEvent: z
    .object({
      id: z.string(),
      title: z.string(),
      coverUrl: z.string().nullable(),
      startAt: z.string().datetime(),
      city: z.string().nullable(),
    })
    .nullable()
    .optional(),
})

export type CommunityThreadSummary = z.infer<typeof communityThreadSummarySchema>

export const communityThreadDetailSchema = communityThreadSummarySchema.extend({
  answers: z.array(communityAnswerDtoSchema),
  canAccept: z.boolean(),
  canModerate: z.boolean().optional(),
  canManage: z.boolean().optional(),
})

export type CommunityThreadDetail = z.infer<typeof communityThreadDetailSchema>

export const createCommunityThreadBodySchema = z
  .object({
    kind: communityThreadKindSchema,
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().max(5000).optional(),
    topic: z.string().trim().max(80).optional().nullable(),
    locationName: z.string().trim().max(120).optional().nullable(),
    mediaUrls: z.array(z.string().url()).max(10).optional(),
    journeyId: z.string().optional().nullable(),
    eventId: z.string().optional().nullable(),
    listingId: z.string().optional().nullable(),
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

export const createCommunityReportBodySchema = z
  .object({
    targetType: z.enum(['POST', 'COMMENT', 'USER']),
    targetId: z.string(),
    reason: z.string().trim().min(3).max(120),
    description: z.string().trim().max(2000).optional(),
    ruleId: z.string().optional().nullable(),
  })
  .strict()

export type CreateCommunityReportBody = z.infer<typeof createCommunityReportBodySchema>

export const communityReportSchema = z.object({
  id: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string(),
  description: z.string().nullable(),
  status: z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']),
  createdAt: z.string().datetime(),
  reporter: communityAuthorSchema,
  rule: communityRuleSchema.nullable().optional(),
})

export type CommunityReportDto = z.infer<typeof communityReportSchema>

export const updateMemberRoleBodySchema = z
  .object({
    role: communityMemberRoleSchema,
  })
  .strict()

export type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleBodySchema>
